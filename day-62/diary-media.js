/* Photos and voice recordings are saved with their entry in the Day store. */
(function () {
  'use strict';
  const clock = seconds => {
    const total = Math.max(0, Math.round(seconds || 0));
    return Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0');
  };
  function read(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
      reader.readAsDataURL(file);
    });
  }
  async function photo(file) {
    const source = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = source;
      await img.decode();
      const ratio = Math.min(1, 1800 / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * ratio));
      canvas.height = Math.max(1, Math.round(img.height * ratio));
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return {kind:'photo', name:file.name || 'Фотография', portrait:canvas.height > canvas.width,
        src:canvas.toDataURL('image/jpeg', .83)};
    } catch {
      throw new Error('Не удалось открыть изображение. Попробуй выбрать фото из медиатеки.');
    } finally { URL.revokeObjectURL(source); }
  }
  function duration(src) {
    return new Promise(resolve => {
      const player = document.createElement('audio');
      const finish = () => {
        clearTimeout(timer);
        const value = Number.isFinite(player.duration) ? player.duration : 0;
        player.onloadedmetadata = player.onerror = null;
        player.removeAttribute('src'); player.load(); resolve(value);
      };
      const timer = setTimeout(finish, 3500);
      player.preload = 'metadata'; player.onloadedmetadata = player.onerror = finish;
      player.src = src;
    });
  }
  const barCount = 40;
  async function analyzeAudio(file) {
    const OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OfflineContext || file.size > 16 * 1024 * 1024) return null;
    try {
      const context = new OfflineContext(1, 1, 16000);
      const data = await context.decodeAudioData(await file.arrayBuffer());
      const peaks = Array(barCount).fill(0);
      for (let channel = 0; channel < data.numberOfChannels; channel++) {
        const samples = data.getChannelData(channel);
        for (let i = 0; i < barCount; i++) {
          const start = Math.floor(i * samples.length / barCount);
          const end = Math.floor((i + 1) * samples.length / barCount);
          const stride = Math.max(1, Math.floor((end - start) / 2048));
          for (let j = start; j < end; j += stride) {
            peaks[i] = Math.max(peaks[i], Math.abs(samples[j]));
          }
        }
      }
      return {peaks, seconds:data.duration};
    } catch { return null; }
  }
  async function audio(file, seconds, recordedPeaks) {
    const type = file.type || (/\.m4a$/i.test(file.name) ? 'audio/mp4' : /\.mp3$/i.test(file.name) ? 'audio/mpeg' : /\.wav$/i.test(file.name) ? 'audio/wav' : 'audio/octet-stream');
    const src = await read(file.type ? file : file.slice(0, file.size, type));
    const shape = recordedPeaks?.length ? {peaks:recordedPeaks} : await analyzeAudio(file);
    return {kind:'audio', name:file.name || 'Голосовая запись', src,
      seconds:seconds || shape?.seconds || await duration(src), peaks:shape?.peaks || []};
  }
  function measureStream(stream) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    let context, analyser, source, buffer, sampler;
    const levels = [];
    let interval = 100;
    function getLevel() {
      if (!analyser || context.state !== 'running') return null;
      analyser.getByteTimeDomainData(buffer);
      let peak = 0;
      for (const value of buffer) peak = Math.max(peak, Math.abs(value - 128) / 128);
      return peak;
    }
    function sample() {
      const level = getLevel();
      if (level === null) return;
      levels.push(level);
      if (levels.length >= 2048) {
        for (let i = 0; i < 1024; i++) levels[i] = Math.max(levels[2*i], levels[2*i+1]);
        levels.length = 1024;
        clearInterval(sampler);
        interval *= 2;
        sampler = setInterval(sample, interval);
      }
    }
    if (AudioCtx) {
      try {
        context = new AudioCtx();
        analyser = context.createAnalyser();
        analyser.fftSize = 512;
        buffer = new Uint8Array(analyser.fftSize);
        source = context.createMediaStreamSource(stream);
        source.connect(analyser);
        context.resume().catch(() => {});
        sampler = setInterval(sample, interval);
      } catch { analyser = null; }
    }
    return {
      getLevel,
      finish() {
        clearInterval(sampler);
        source?.disconnect();
        if (context && context.state !== 'closed') context.close().catch(() => {});
        if (!levels.length) return [];
        return Array.from({length:barCount}, (_, i) => {
          const start = Math.floor(i * levels.length / barCount);
          const end = Math.max(start + 1, Math.floor((i + 1) * levels.length / barCount));
          return Math.max(...levels.slice(start, end));
        });
      }
    };
  }
  async function startVoice(onClip,onError,onDone) {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
      throw new Error('Запись микрофона здесь недоступна. Можно прикрепить аудиофайл.');
    const stream = await navigator.mediaDevices.getUserMedia({audio:true});
    let meter, peaks = [];
    const release = () => {
      if (meter) { peaks = meter.finish(); meter = null; }
      stream.getTracks().forEach(track => track.stop());
    };
    try {
      const types = ['audio/mp4','audio/webm;codecs=opus','audio/webm'];
      const mimeType = types.find(type => MediaRecorder.isTypeSupported?.(type));
      const rec = new MediaRecorder(stream, mimeType ? {mimeType,audioBitsPerSecond:64000} : undefined);
      const chunks = [], started = Date.now();
      let failed=false;
      rec.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      rec.onerror = () => {failed=true;release();onError(new Error('Микрофон прервал запись'));onDone();};
      rec.onstop = async () => {
        release();
        if(failed)return;
        try {
          if(!chunks.length)throw new Error('Микрофон не записал звук');
          const blob = new Blob(chunks,{type:rec.mimeType || chunks[0].type});
          await onClip(await audio(blob, Math.max(1,(Date.now()-started)/1000), peaks));
        } catch (error) {onError(error);}
        finally {onDone();}
      };
      meter = measureStream(stream);
      rec.start(500);
      return {stop(){if(rec.state==='recording')rec.stop();}, started, getLevel:() => meter?.getLevel() ?? null};
    } catch (error) {release();throw error;}
  }
  window.HappyDiaryMedia = {clock, photo, audio, startVoice, analyzeAudio};
})();
