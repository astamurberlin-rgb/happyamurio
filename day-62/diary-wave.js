/* Voice clips in the Day diary. The waveform and native audio share one timeline. */
(function () {
  'use strict';
  const count = 40;
  const liveLevels = new WeakMap();
  const escape = text => String(text).replace(/[&<>"']/g, c =>
    ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'})[c]);
  const clock = seconds => window.HappyDiaryMedia.clock(seconds);
  const playIcon = '<path d="M7 4.5 19 12 7 19.5Z" fill="currentColor"/>';
  const pauseIcon = '<path d="M6 5h4v14H6zm8 0h4v14h-4z" fill="currentColor"/>';
  const stopIcon = '<rect x="5" y="5" width="14" height="14" rx="3" fill="currentColor"/>';
  const icon = shape => '<svg viewBox="0 0 24 24" aria-hidden="true">'+shape+'</svg>';
  let currentPlayer;
  const recentShapes = new Map();
  let cachedChars = 0;

  function path(peaks, live) {
    const top = live ? 1 : Math.max(0.025, ...peaks);
    return Array.from({length:count}, (_, i) => {
      const level = peaks[Math.floor(i * peaks.length / count)] || 0;
      const height = Math.max(1, Math.round(Math.pow(Math.min(1, level / top),live ? .6 : 1.65) * 11));
      return 'M'+(i * 4 + 2)+' '+(12-height)+'v'+(2*height);
    }).join(' ');
  }
  function graph(peaks, live=false) {
    const d = path(peaks, live);
    return '<svg class="jd-wave-graph" viewBox="0 0 160 24" preserveAspectRatio="none" aria-hidden="true">'+
      '<path d="'+d+'"></path></svg>';
  }
  function markup(item, escapedSrc, paper=false) {
    const name = escape(item.name || 'Голосовая запись');
    const seconds = Math.max(0, Number(item.seconds) || 0);
    const peaks = Array.isArray(item.peaks) ? item.peaks.slice(0, count).map(v =>
      Math.max(0, Math.min(1, Number(v) || 0))) : [];
    const length = seconds ? clock(seconds) : '—:—';
    if (paper) {
      return '<span class="jd-wave-paper">'+name+(seconds ? ' · '+length : '')+'</span>';
    }
    return '<div class="jd-wave" contenteditable="false" data-jd-wave data-duration="'+seconds+'"'+
      (peaks.length ? '' : ' data-need-shape')+' role="group" aria-label="'+name+'">'+
      '<button type="button" class="jd-wave-toggle" aria-label="Воспроизвести" title="Воспроизвести">'+icon(playIcon)+'</button>'+
      '<div class="jd-wave-track">'+graph(peaks)+'<span class="jd-wave-played" aria-hidden="true">'+graph(peaks)+'</span>'+
      '<input type="range" class="jd-wave-seek" min="0" max="1000" value="0" aria-label="Позиция записи" aria-valuetext="0:00"></div>'+
      '<time class="jd-wave-time">'+length+'</time><audio preload="metadata" src="'+escapedSrc+'"></audio></div>';
  }
  function live() {
    return '<div class="jd-wave jd-wave-live" role="group" aria-label="Идёт запись голоса">'+
      '<button type="button" class="jd-wave-toggle" data-jd="voice" aria-label="Остановить запись" title="Остановить запись">'+icon(stopIcon)+'</button>'+
      '<span class="jd-wave-status">Запись</span><div class="jd-wave-track">'+graph([],true)+'</div>'+
      '<time class="jd-wave-time" aria-live="off">0:00</time></div>';
  }
  function updateLive(element, recorder) {
    if (!element || !recorder) return;
    const container = element.matches('.jd-wave-live') ? element : element.querySelector('.jd-wave-live');
    if (!container) return;
    let levels = liveLevels.get(container);
    if (!levels) { levels = Array(count).fill(0); liveLevels.set(container, levels); }
    levels.shift();
    levels.push(recorder.getLevel?.() || 0);
    container.querySelector('path[d]').setAttribute('d', path(levels, true));
    container.querySelector('time').textContent = clock(Math.floor((Date.now() - recorder.started) / 1000));
  }
  function duration(player, wave) {
    return Number.isFinite(player.duration) && player.duration > 0 ? player.duration : Number(wave.dataset.duration) || 0;
  }
  function updatePlayer(player) {
    const wave = player.closest('[data-jd-wave]');
    if (!wave) return;
    const total = duration(player, wave), elapsed = player.currentTime || 0;
    const progress = total ? Math.min(1, elapsed / total) : 0;
    const active = !player.paused && !player.ended;
    wave.style.setProperty('--jd-wave-position', (100 * progress)+'%');
    const seek = wave.querySelector('input');
    seek.value = Math.round(1000 * progress);
    seek.setAttribute('aria-valuetext', clock(elapsed)+(total ? ' из '+clock(total) : ''));
    wave.querySelector('time').textContent = active || (elapsed > 0 && !player.ended) ? clock(elapsed) : (total ? clock(total) : '—:—');
    const btn = wave.querySelector('button');
    if (btn.dataset.playing !== String(active)) {
      btn.dataset.playing = String(active);
      btn.innerHTML = icon(active ? pauseIcon : playIcon);
      btn.title = active ? 'Приостановить' : 'Воспроизвести';
      btn.setAttribute('aria-label', btn.title);
    }
  }
  function legacyShape(source) {
    const previous = recentShapes.get(source);
    if (previous) {
      recentShapes.delete(source);
      recentShapes.set(source, previous);
      return previous;
    }
    const encoded = source.slice(source.indexOf(',') + 1);
    const audio = atob(encoded);
    const bytes = new Uint8Array(audio.length);
    for (let i = 0; i < audio.length; i++) bytes[i] = audio.charCodeAt(i);
    const result = window.HappyDiaryMedia.analyzeAudio(new Blob([bytes]));
    recentShapes.set(source, result);
    cachedChars += source.length;
    while (recentShapes.size > 10 || cachedChars > 24 * 1024 * 1024) {
      const oldest = recentShapes.keys().next().value;
      recentShapes.delete(oldest);
      cachedChars -= oldest.length;
    }
    return result;
  }
  async function loadLegacyShape(wave, player) {
    if (!wave.hasAttribute('data-need-shape')) return;
    wave.removeAttribute('data-need-shape');
    try {
      const source = player.getAttribute('src') || '';
      if (!/^data:audio\/[^,]+;base64,/.test(source)) return;
      // Data URLs already include all the bytes. Avoid decoding large old attachments.
      if (source.length > 22 * 1024 * 1024) return;
      const shape = await legacyShape(source);
      if (!shape || !wave.isConnected) return;
      wave.querySelectorAll('.jd-wave-graph path').forEach(el => el.setAttribute('d', path(shape.peaks, false)));
      if (!Number(wave.dataset.duration)) wave.dataset.duration = String(shape.seconds);
      updatePlayer(player);
    } catch { /* Playback works even when the browser cannot decode the waveform. */ }
  }
  const visibleWaves = window.IntersectionObserver && new window.IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      visibleWaves.unobserve(entry.target);
      loadLegacyShape(entry.target, entry.target.querySelector('audio'));
    }
  });
  document.addEventListener('click', async event => {
    const btn = event.target.closest?.('[data-jd-wave] .jd-wave-toggle');
    if (!btn) return;
    const wave = btn.closest('[data-jd-wave]'), player = wave.querySelector('audio');
    if (!player.paused && !player.ended) { player.pause(); return; }
    if (currentPlayer && currentPlayer !== player) currentPlayer.pause();
    currentPlayer = player;
    try {
      await player.play();
      loadLegacyShape(wave, player);
    } catch {
      const msg = 'Не удалось воспроизвести аудио';
      btn.title = msg;
      if (!wave.querySelector('[role=status]')) {
        const status = document.createElement('span');
        status.setAttribute('role', 'status');
        status.className = 'jd-wave-error';
        status.textContent = msg;
        wave.appendChild(status);
      }
    }
  });
  document.addEventListener('input', event => {
    if (!event.target.matches?.('.jd-wave-seek')) return;
    const wave = event.target.closest('[data-jd-wave]'), player = wave.querySelector('audio');
    const total = duration(player, wave);
    if (total) {
      player.currentTime = total * Number(event.target.value) / 1000;
      updatePlayer(player);
    }
  });
  for (const event of ['loadedmetadata', 'durationchange', 'timeupdate', 'play', 'pause', 'ended']) {
    document.addEventListener(event, e => {
      if (!e.target.matches?.('[data-jd-wave] audio')) return;
      updatePlayer(e.target);
      if (event === 'loadedmetadata') {
        const wave = e.target.closest('[data-jd-wave]');
        if (wave.hasAttribute('data-need-shape')) {
          if (visibleWaves) visibleWaves.observe(wave);
          else loadLegacyShape(wave, e.target);
        }
      }
    }, true);
  }
  window.HappyDiaryWave = {markup, live, updateLive};
})();
