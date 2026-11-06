/* One artboard: independent canvas/PNG layers, using the Icon Studio theme. */
(function () {
  'use strict';
  const G = window.HappyGradients, E = window.HappyGradientEditor, API = window.HappyAppIcons;
  const BLENDS = ['source-over', 'multiply', 'screen', 'overlay', 'soft-light'];
  let app = 'day', draft, sources = [], sourceImage, backgroundImage, backgroundEditor, iconEditor;
  let activeLayer = 'background', job = 0, raf = 0, saveTimer, opener, drag;
  let oldOverflow = '', oldInert = false, oldAriaHidden = null, dirty = false, opening = 0;
  const panel = document.createElement('section');
  panel.className = 'ic-composer';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'Редактор иконки');
  const transform = (key, title, min, max) => `
    <label class="ic-transform-field"><span class="ic-transform-head"><span>${title}</span>
      <span class="ic-transform-stepper"><button type="button" data-step="${key}" data-by="-1" aria-label="Уменьшить: ${title}">−</button>
      <input data-number="${key}" type="number" min="${min}" max="${max}" step="1" aria-label="${title} — точное значение">
      <button type="button" data-step="${key}" data-by="1" aria-label="Увеличить: ${title}">+</button></span></span>
      <input data-range="${key}" type="range" min="${min}" max="${max}" step="1" aria-label="${title}"></label>`;
  panel.innerHTML = `
    <header class="ic-head">
      <button type="button" id="ic-close" class="ic-back" aria-label="Назад в Icon Studio">‹</button>
      <div class="ic-title"><small id="ic-app-label"></small><h1>Редактор иконки</h1></div>
      <button type="button" class="ic-primary" id="ic-save-variant">Сохранить вариант</button>
      <details class="ic-file-menu" id="ic-file-menu"><summary aria-label="Экспорт и настройки">⋯</summary>
        <div class="ic-file-actions">
          <strong>Скачать PNG · 1024 × 1024</strong>
          <button type="button" data-export="composition">Вся композиция ↓</button>
          <button type="button" data-export="base">Только холст ↓</button>
          <button type="button" data-export="icon">Иконка без фона ↓</button>
          <hr><button type="button" id="ic-export-draft">Настройки JSON ↓</button>
          <label class="ic-file-upload" tabindex="0" role="button">Загрузить настройки<input id="ic-import-draft" type="file" accept="application/json,.json" hidden></label>
        </div>
      </details>
    </header>
    <div class="ic-workspace">
      <section class="ic-artboard-col" aria-label="Рабочий холст">
        <div class="ic-artboard-stage"><div class="ic-canvas-wrap">
          <canvas id="ic-canvas" width="512" height="512" tabindex="0" aria-label="Холст иконки" aria-describedby="ic-tool-hint"></canvas>
          <span id="ic-focal" class="ic-focal" hidden aria-hidden="true"></span>
        </div></div>
        <div class="ic-artboard-toolbar">
          <label class="ic-tool-select"><span>На холсте</span><select id="ic-canvas-tool" aria-label="Действие на холсте">
            <option value="view">Просмотр</option><option value="move">Переместить PNG</option>
            <option value="gradient">Направление / центр градиента</option>
            <option value="glow">Свечение 1</option><option value="extraGlow">Свечение 2</option>
          </select></label>
          <span class="ic-canvas-size">1024 × 1024</span>
        </div>
        <p class="ic-tool-hint" id="ic-tool-hint"></p>
        <p id="ic-status" class="ic-status" role="status" aria-live="polite"></p>
      </section>
      <aside class="ic-settings" aria-label="Настройки выбранного слоя">
        <div class="ic-layer-tabs" role="tablist" aria-label="Редактируемый слой">
          <button type="button" role="tab" id="ic-tab-background" aria-controls="ic-background-settings" aria-selected="true" data-layer="background">Холст</button>
          <button type="button" role="tab" id="ic-tab-icon" aria-controls="ic-icon-settings" aria-selected="false" data-layer="icon" tabindex="-1">Иконка · PNG</button>
        </div>
        <div class="ic-settings-scroll" id="ic-settings-scroll">
          <section role="tabpanel" id="ic-background-settings" aria-labelledby="ic-tab-background">
            <label class="ic-check"><input id="ic-base-visible" type="checkbox" checked>Показать фон холста</label>
            <label class="ic-select">Фон<select id="ic-background-mode"><option value="original">Исходный фон иконки</option><option value="gradient">Свой редактируемый градиент</option></select></label><label class="ic-upload" tabindex="0" role="button">＋ Загрузить фон · PNG<input id="ic-background-upload" type="file" accept="image/png,.png" hidden></label><button type="button" class="ic-theme-button" id="ic-background-restore">Вернуть исходный фон</button><p id="ic-background-note" class="app-icon-hint"></p><div id="ic-background-editor"></div>
            <details class="ic-extra"><summary>Готовые темы</summary><div>
              <button type="button" class="ic-theme-button" id="ic-blue-theme">Синий час</button>
              <a class="ic-subtle-link" href="https://astamurberlin-rgb.github.io/happyamurio/prototypes/happy-family-color-studio-v12.html" target="_blank" rel="noopener">Открыть Color Studio ↗</a>
            </div></details>
          </section>
          <section role="tabpanel" id="ic-icon-settings" aria-labelledby="ic-tab-icon" hidden>
            <label class="ic-check"><input id="ic-icon-visible" type="checkbox" checked>Показать иконку</label>
            <label class="ic-select">Изображение<select id="ic-source" aria-label="Выбрать PNG или слой иконки"></select></label>
            <label class="ic-upload" tabindex="0" role="button">＋ Загрузить PNG<input id="ic-upload" type="file" accept="image/png,.png" hidden></label>
            <label class="ic-select">Цвет иконки<select id="ic-icon-mode" aria-label="Цвет иконки">
              <option value="original">Исходные цвета PNG</option><option value="recolor">Свой цвет или градиент</option>
            </select></label>
            <div id="ic-icon-editor"></div>
            <details class="ic-extra"><summary>Размер и наложение</summary><div>
              <label class="ic-select">Режим наложения<select id="ic-blend-mode" aria-label="Режим наложения PNG">
                <option value="source-over">Обычный</option><option value="multiply">Умножение</option>
                <option value="screen">Экран</option><option value="overlay">Перекрытие</option><option value="soft-light">Мягкий свет</option>
              </select></label>
              <div class="ic-transform">${transform('scale', 'Масштаб, %', 10, 200)}${transform('x', 'Сдвиг по горизонтали, %', -100, 100)}${transform('y', 'Сдвиг по вертикали, %', -100, 100)}${transform('opacity', 'Непрозрачность, %', 0, 100)}</div>
              <button type="button" id="ic-center">По центру · 100%</button>
            </div></details>
          </section>
          <p class="ic-version">Happy Icon Studio · v2.16</p>
        </div>
      </aside>
    </div>`;
  document.body.append(panel);
  const $ = id => document.getElementById(id), canvas = $('ic-canvas');
  function status(message, error = false) {
    $('ic-status').textContent = message;
    $('ic-status').classList.toggle('is-error', error);
  }
  function clean(value) {
    const n = (v, min, max, fallback) => Number.isFinite(Number(v)) ? Math.max(min, Math.min(max, Number(v))) : fallback;
    return {
      version: 1, masterId: value?.masterId || '', backgroundMode: value?.backgroundMode === 'original' ? 'original' : 'gradient', backgroundSourceId: value?.backgroundSourceId || '', originalBackgroundSourceId: value?.originalBackgroundSourceId ?? value?.backgroundSourceId ?? '', backgroundFit: value?.backgroundFit === 'cover' ? 'cover' : 'stretch', background: G.normalize(value?.background || G.fromLegacy(G.blueHour.state)),
      icon: G.normalize(value?.icon || {type: 'solid', stops: [{color: '#111c2a', position: 0}, {color: '#111c2a', position: 100}]}),
      baseVisible: value?.baseVisible !== false, iconVisible: value?.iconVisible !== false,
      iconMode: value?.iconMode === 'recolor' ? 'recolor' : 'original',
      blendMode: BLENDS.includes(value?.blendMode) ? value.blendMode : 'source-over',
      sourceId: typeof value?.sourceId === 'string' ? value.sourceId.slice(0, 100) : '',
      scale: n(value?.scale, 10, 200, 100), x: n(value?.x, -100, 100, 0), y: n(value?.y, -100, 100, 0), opacity: n(value?.opacity, 0, 100, 100)
    };
  }
  function persist() {
    clearTimeout(saveTimer);
    if (!dirty) return;
    try { API.saveColorDraft(app, draft); dirty = false; } catch (error) { status(error.message, true); }
  }
  function changed() {
    dirty = true;
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => { raf = 0; render(); });
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 180);
  }
  function selectedModel() { return activeLayer === 'background' ? draft.background : draft.icon; }
  function selectedEditor() { return activeLayer === 'background' ? backgroundEditor : iconEditor; }
  function setControls() {
    for (const key of ['scale', 'x', 'y', 'opacity']) for (const attr of ['data-number', 'data-range']) panel.querySelector('.ic-transform [' + attr + '=' + key + ']').value = draft[key];
    $('ic-base-visible').checked = draft.baseVisible;
    $('ic-background-mode').value = draft.backgroundMode;
    $('ic-background-mode').querySelector('[value=original]').disabled = !draft.backgroundSourceId;
    $('ic-background-restore').hidden = !draft.originalBackgroundSourceId || draft.backgroundSourceId === draft.originalBackgroundSourceId;
    $('ic-background-editor').hidden = draft.backgroundMode === 'original';
    $('ic-background-note').textContent = draft.backgroundMode === 'original' ? (draft.backgroundSourceId !== draft.originalBackgroundSourceId ? 'Ваш PNG-фон. Изображение заполняет холст без растяжения; края могут обрезаться. Иконка поверх него не изменена.' : 'Сохранён исходный фон без пересоздания. В PNG нет исходных точек и угла градиента. Загрузите JSON настроек для их редактирования или явно выберите новый градиент.') : '';
    $('ic-icon-visible').checked = draft.iconVisible;
    $('ic-icon-mode').value = draft.iconMode;
    $('ic-blend-mode').value = draft.blendMode;
    $('ic-icon-editor').hidden = draft.iconMode === 'original';
    for (const key of ['background', 'icon']) {
      const selected = activeLayer === key;
      $('ic-tab-' + key).setAttribute('aria-selected', selected);
      $('ic-tab-' + key).tabIndex = selected ? 0 : -1;
      $('ic-' + key + '-settings').hidden = !selected;
    }
    const tool = $('ic-canvas-tool'), model = selectedModel();
    const canColor = activeLayer === 'background' ? draft.backgroundMode !== 'original' : draft.iconMode === 'recolor';
    tool.querySelector('[value=move]').disabled = !sourceImage || !draft.iconVisible;
    tool.querySelector('[value=gradient]').disabled = !canColor || model.type === 'solid';
    tool.querySelector('[value=glow]').disabled = !canColor;
    tool.querySelector('[value=extraGlow]').disabled = !canColor;
    if (tool.selectedOptions[0]?.disabled || ['glow', 'extraGlow'].includes(tool.value) && !model[tool.value]?.enabled) tool.value = 'view';
    canvas.dataset.tool = tool.value;
    $('ic-tool-hint').textContent = tool.value === 'move' ? 'Перетаскивай PNG на холсте.' : tool.value === 'gradient' ? (['linear', 'curved'].includes(model.type) ? 'Меняй направление градиента прямо на холсте.' : 'Перемещай центр градиента прямо на холсте.') : ['glow', 'extraGlow'].includes(tool.value) ? 'Перемещай точку свечения прямо на холсте.' : 'Все изменения видны на этом холсте.';
    const point = $('ic-focal');
    point.hidden = !['gradient', 'glow', 'extraGlow'].includes(tool.value);
    if (!point.hidden) {
      const target = tool.value === 'gradient' ? model : model[tool.value];
      if (target) {
        const directional = tool.value === 'gradient' && ['linear', 'curved'].includes(model.type), angle = model.angle * Math.PI / 180;
        point.style.left = (directional ? 50 + Math.sin(angle) * 38 : target.x) + '%';
        point.style.top = (directional ? 50 - Math.cos(angle) * 38 : target.y) + '%';
      }
    }
  }
  function makeCanvas(size) { const result = document.createElement('canvas'); result.width = result.height = size; return result; }
  function drawCanvas(target, mode = 'composition') {
    const size = target.width, ctx = target.getContext('2d');
    ctx.clearRect(0, 0, size, size);
    if (mode === 'base' || mode === 'composition' && draft.baseVisible) {
      if (draft.backgroundMode === 'original') { if (backgroundImage) {
        if (draft.backgroundFit === 'cover') { const ratio = Math.max(size / backgroundImage.naturalWidth, size / backgroundImage.naturalHeight), w = backgroundImage.naturalWidth * ratio, h = backgroundImage.naturalHeight * ratio; ctx.drawImage(backgroundImage, (size-w)/2, (size-h)/2, w, h); }
        else ctx.drawImage(backgroundImage, 0, 0, size, size);
      } }
      else G.paint(ctx, draft.background, size, size);
    }
    if (mode === 'base' || mode === 'composition' && !draft.iconVisible || !sourceImage) return;
    const layer = makeCanvas(size), lc = layer.getContext('2d'), ratio = size / Math.max(sourceImage.naturalWidth, sourceImage.naturalHeight) * draft.scale / 100;
    const w = sourceImage.naturalWidth * ratio, h = sourceImage.naturalHeight * ratio;
    lc.drawImage(sourceImage, (size - w) / 2 + draft.x / 100 * size, (size - h) / 2 + draft.y / 100 * size, w, h);
    if (draft.iconMode === 'recolor') {
      const fill = makeCanvas(size); G.paint(fill.getContext('2d'), draft.icon, size, size);
      lc.globalCompositeOperation = 'source-in'; lc.drawImage(fill, 0, 0);
    }
    ctx.save(); ctx.globalAlpha = draft.opacity / 100;
    // The transparent icon export keeps its own colors; blending belongs to the composite.
    ctx.globalCompositeOperation = mode === 'composition' ? draft.blendMode : 'source-over';
    ctx.drawImage(layer, 0, 0); ctx.restore();
  }
  function render() { drawCanvas(canvas); setControls(); }
  async function loadSource() {
    const stamp = ++job; sourceImage = null; backgroundImage = null;
    const background = sources.find(item => item.id === draft.backgroundSourceId);
    if (background) {
      try { const image = new Image(); await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=background.src;}); if(stamp!==job)return; backgroundImage=image; }
      catch { if(stamp===job)status('Не удалось открыть исходный фон.',true); return; }
    }
    if(stamp!==job)return; render();
    const source = sources.find(item => item.id === draft.sourceId);
    if (!source) { status(backgroundImage ? 'Исходная иконка загружена без изменений.' : 'Загрузи PNG во вкладке «Иконка».'); return; }
    try {
      const image = new Image();
      await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = source.src; });
      if (stamp !== job) return;
      sourceImage = image; render(); status('Изменения сохраняются автоматически.');
    } catch { if (stamp === job) status('Не удалось открыть PNG. Выбери другое изображение.', true); }
  }
  async function refreshSources() {
    const currentApp=app, available=await API.editorSources(app);
    if(currentApp!==app)return; sources=available;
    const select = $('ic-source'); select.replaceChildren();
    for (const source of sources) {
      const option = document.createElement('option'); option.value = source.id;
      option.textContent = (source.role === 'foreground' ? 'Слой · ' : '') + source.name; select.append(option);
    }
    if (!draft.masterId && !draft.sourceId) draft.sourceId = (sources.find(item => item.role === 'foreground' && item.type === 'image/png') || sources.find(item => item.role === 'foreground'))?.id || '';
    if (draft.sourceId && !sources.some(item=>item.id===draft.sourceId)) { const option=document.createElement('option'); option.value=draft.sourceId; option.textContent='Исходный PNG недоступен'; select.prepend(option); }
    if (!draft.sourceId) { const option = document.createElement('option'); option.value = ''; option.textContent = 'Выбери или загрузи PNG'; select.prepend(option); }
    select.value = draft.sourceId;
  }
  function selectLayer(key) {
    activeLayer = key;
    $('ic-canvas-tool').value = key === 'icon' && draft.iconVisible && sourceImage ? 'move' : 'view';
    $('ic-settings-scroll').scrollTop = 0;
    setControls();
  }
  async function open(id, button) {
    const stamp=++opening;
    await API.ready; if(stamp!==opening)return;
    persistIfOpen();
    const initial=await API.editorInitial(id); if(stamp!==opening)return;
    app = id; opener = button; draft = clean(initial); dirty = false;
    await refreshSources(); if(stamp!==opening)return;
    $('ic-app-label').textContent = 'Happy ' + ({day: 'Day', meal: 'Meal', sport: 'Sport', studio: 'Icon Studio', color: 'Color Studio'}[app]);
    if(panel.hidden) oldOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const library = $('library-page'); if(panel.hidden){oldInert = library.inert; oldAriaHidden = library.getAttribute('aria-hidden');} library.inert = true; library.setAttribute('aria-hidden', 'true');
    panel.hidden = false; $('ic-file-menu').open = false;
    if (!backgroundEditor) {
      backgroundEditor = E.mount($('ic-background-editor'), draft.background, model => { draft.background = model; changed(); }, {preview: false});
      iconEditor = E.mount($('ic-icon-editor'), draft.icon, model => { draft.icon = model; changed(); }, {preview: false});
    } else { backgroundEditor.set(draft.background); iconEditor.set(draft.icon); }
    selectLayer('background'); await loadSource(); $('ic-close').focus();
  }
  function persistIfOpen() { if (!panel.hidden && draft) persist(); }
  function close() {
    persistIfOpen(); panel.hidden = true; job++; opening++; drag = null;
    if (raf) cancelAnimationFrame(raf); raf = 0;
    document.body.style.overflow = oldOverflow;
    const library = $('library-page'); library.inert = oldInert;
    if (oldAriaHidden === null) library.removeAttribute('aria-hidden'); else library.setAttribute('aria-hidden', oldAriaHidden);
    (opener?.isConnected ? opener : library.querySelector('[data-color-editor="' + app + '"]'))?.focus();
  }
  document.addEventListener('click', event => { const button = event.target.closest('[data-color-editor]'); if (button) open(button.dataset.colorEditor, button).catch(error => status(error.message, true)); });
  $('ic-close').onclick = close;
  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); if ($('ic-file-menu').open) $('ic-file-menu').open = false; else close(); }
    if (event.key === 'Tab') {
      const nodes = [...panel.querySelectorAll('button,a,input,select,summary,[tabindex="0"]')].filter(node => !node.disabled && node.tabIndex !== -1 && node.getClientRects().length);
      if (event.shiftKey && document.activeElement === nodes[0]) { event.preventDefault(); nodes.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === nodes.at(-1)) { event.preventDefault(); nodes[0].focus(); }
    }
    const upload = event.target.closest('.ic-upload,.ic-file-upload');
    if (upload && ['Enter', ' '].includes(event.key)) { event.preventDefault(); upload.querySelector('input').click(); }
    const tab = event.target.closest('[data-layer]');
    if (tab && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault(); const key = event.key === 'Home' ? 'background' : event.key === 'End' ? 'icon' : activeLayer === 'icon' ? 'background' : 'icon';
      selectLayer(key); $('ic-tab-' + key).focus();
    }
  });
  for (const key of ['background', 'icon']) $('ic-tab-' + key).onclick = () => selectLayer(key);
  for (const [id, key] of [['ic-base-visible', 'baseVisible'], ['ic-icon-visible', 'iconVisible']]) $(id).onchange = event => { draft[key] = event.target.checked; changed(); };
  $('ic-background-mode').onchange = event => { draft.backgroundMode = event.target.value; changed(); };
  $('ic-icon-mode').onchange = event => { draft.iconMode = event.target.value; changed(); };
  $('ic-blend-mode').onchange = event => { draft.blendMode = event.target.value; changed(); };
  $('ic-source').onchange = async event => { draft.sourceId = event.target.value; dirty = true; persist(); await loadSource(); };
  function transformChange(key, value) {
    const input = panel.querySelector('.ic-transform [data-range=' + key + ']');
    if (!input || !Number.isFinite(Number(value))) return;
    draft[key] = Math.max(Number(input.min), Math.min(Number(input.max), Number(value))); changed(); setControls();
  }
  panel.addEventListener('input', event => { if (event.target.matches('.ic-transform [data-range]')) transformChange(event.target.dataset.range, event.target.value); });
  panel.addEventListener('change', event => {
    if (event.target.matches('.ic-transform [data-number]')) { if (event.target.value === '') { setControls(); return; } transformChange(event.target.dataset.number, event.target.value); }
  });
  panel.addEventListener('click', event => { const button = event.target.closest('.ic-transform [data-step]'); if (button) transformChange(button.dataset.step, draft[button.dataset.step] + Number(button.dataset.by)); });
  $('ic-center').onclick = () => { Object.assign(draft, {x: 0, y: 0, scale: 100}); changed(); };
  $('ic-blue-theme').onclick = () => { draft.backgroundMode = 'gradient'; draft.background = G.fromLegacy(G.blueHour.state); backgroundEditor.set(draft.background); changed(); };
  // Decode before persisting: a cancelled/corrupt upload never replaces the visible source.
  async function validateBackground(file) {
    if (!file.size || file.size > 8 * 1024 * 1024) throw Error('Выбери PNG-фон размером до 8 МБ');
    const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    if (bytes.join(',') !== '137,80,78,71,13,10,26,10') throw Error('Для фона нужен PNG-файл');
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(Error('PNG повреждён или не поддерживается')); image.src = url; });
      if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 40000000) throw Error('Фон слишком большой: не больше 40 миллионов пикселей');
    } finally { URL.revokeObjectURL(url); }
    return new File([file], /\.png$/i.test(file.name) ? file.name : (file.name || 'background') + '.png', {type: 'image/png'});
  }
  $('ic-background-upload').onchange = async event => {
    const file = event.target.files?.[0]; if (!file) return;
    const currentApp = app, currentDraft = draft, session = opening;
    const current = () => app === currentApp && draft === currentDraft && opening === session && !panel.hidden;
    try {
      if (draft.masterId && draft.originalBackgroundSourceId && !draft.sourceId) throw Error('У этой иконки пока нет отдельного переднего слоя. Сначала выбери прозрачный PNG во вкладке «Иконка · PNG», чтобы новый фон не заменил всю иконку.');
      event.target.disabled = true; status('Проверяю фон…');
      const png = await validateBackground(file); if (!current()) return;
      const id = await API.addBackgroundPNG(currentApp, png); if (!current()) return;
      draft.backgroundSourceId = id; draft.backgroundMode = 'original'; draft.backgroundFit = 'cover'; draft.baseVisible = true;
      await refreshSources(); if (!current()) return;
      dirty = true; persist(); await loadSource();
      if (current()) status('Ваш фон загружен. Иконка и основной вариант не изменены.');
    } catch (error) { if (current()) status(error.message, true); }
    finally { event.target.disabled = false; event.target.value = ''; }
  };
  $('ic-background-restore').onclick = async () => {
    draft.backgroundSourceId = draft.originalBackgroundSourceId; draft.backgroundMode = 'original'; draft.backgroundFit = 'stretch'; draft.baseVisible = true;
    dirty = true; persist(); await loadSource();
  };
  $('ic-upload').onchange = async event => {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      if (file.size > 8 * 1024 * 1024) throw Error('Выбери PNG размером до 8 МБ');
      const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
      if (bytes.join(',') !== '137,80,78,71,13,10,26,10') throw Error('Это не PNG-файл');
      event.target.disabled = true; status('Добавляю PNG…');
      const filePNG = new File([file], /\.png$/i.test(file.name) ? file.name : file.name + '.png', {type: 'image/png'});
      draft.sourceId = await API.addColorPNG(app, filePNG); await refreshSources(); draft.iconVisible = true; dirty = true; persist();
      await loadSource(); $('ic-canvas-tool').value = 'move'; setControls();
    } catch (error) { status(error.message, true); }
    finally { event.target.disabled = false; event.target.value = ''; }
  };
  $('ic-canvas-tool').onchange = () => {
    const key = $('ic-canvas-tool').value;
    if (['glow', 'extraGlow'].includes(key)) {
      const model = selectedModel(); if (!model[key]) model[key] = G.normalize().glow;
      model[key].enabled = true; selectedEditor().set(model); changed();
    }
    setControls();
  };
  function movePoint(x, y) {
    const key = $('ic-canvas-tool').value, model = selectedModel();
    if (key === 'gradient' && ['linear', 'curved'].includes(model.type)) {
      if (Math.hypot(x - 50, y - 50) < 2) return;
      model.angle = Math.round((Math.atan2(x - 50, 50 - y) * 180 / Math.PI + 360) % 360);
    } else {
      const target = key === 'gradient' ? model : model[key]; if (!target) return;
      target.x = x; target.y = y;
    }
    selectedEditor().set(model); changed();
  }
  canvas.addEventListener('pointerdown', event => {
    const tool = $('ic-canvas-tool').value;
    if (tool === 'view' || tool === 'move' && (!sourceImage || !draft.iconVisible)) return;
    event.preventDefault(); canvas.setPointerCapture(event.pointerId); canvas.focus();
    drag = {x: event.clientX, y: event.clientY, dx: draft.x, dy: draft.y};
    if (tool !== 'move') { const r = canvas.getBoundingClientRect(); movePoint(Math.round(Math.max(0, Math.min(100, (event.clientX - r.left) / r.width * 100))), Math.round(Math.max(0, Math.min(100, (event.clientY - r.top) / r.height * 100)))); }
  });
  canvas.addEventListener('pointermove', event => {
    if (!drag || !canvas.hasPointerCapture(event.pointerId)) return;
    const r = canvas.getBoundingClientRect();
    if ($('ic-canvas-tool').value === 'move') {
      draft.x = Math.max(-100, Math.min(100, Math.round(drag.dx + (event.clientX - drag.x) / r.width * 100)));
      draft.y = Math.max(-100, Math.min(100, Math.round(drag.dy + (event.clientY - drag.y) / r.height * 100))); changed();
    } else movePoint(Math.round(Math.max(0, Math.min(100, (event.clientX - r.left) / r.width * 100))), Math.round(Math.max(0, Math.min(100, (event.clientY - r.top) / r.height * 100))));
  });
  for (const event of ['pointerup', 'pointercancel']) canvas.addEventListener(event, () => { drag = null; });
  canvas.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault(); const tool = $('ic-canvas-tool').value, delta = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1;
    if (tool === 'move') { const key = ['ArrowLeft', 'ArrowRight'].includes(event.key) ? 'x' : 'y'; draft[key] = Math.max(-100, Math.min(100, draft[key] + delta)); changed(); }
    else if (tool === 'gradient' && ['linear', 'curved'].includes(selectedModel().type)) { const model = selectedModel(); model.angle = (model.angle + delta + 360) % 360; selectedEditor().set(model); changed(); }
    else if (['gradient', 'glow', 'extraGlow'].includes(tool)) { const model = selectedModel(), target = tool === 'gradient' ? model : model[tool], key = ['ArrowLeft', 'ArrowRight'].includes(event.key) ? 'x' : 'y'; if (target) movePoint(key === 'x' ? Math.max(0, Math.min(100, target.x + delta)) : target.x, key === 'y' ? Math.max(0, Math.min(100, target.y + delta)) : target.y); }
  });
  async function png(mode) {
    if (mode === 'icon' && !sourceImage) throw Error('Сначала выбери или загрузи PNG');
    const result = makeCanvas(1024); drawCanvas(result, mode);
    return new Promise((resolve, reject) => result.toBlob(blob => blob ? resolve(blob) : reject(Error('Не удалось подготовить PNG')), 'image/png'));
  }
  function download(blob, name) {
    const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  panel.addEventListener('click', async event => {
    const button = event.target.closest('[data-export]'); if (!button) return;
    try { button.disabled = true; const mode = button.dataset.export; download(await png(mode), 'happy-' + app + '-' + mode + '.png'); $('ic-file-menu').open = false; status('PNG сохранён · 1024 × 1024'); }
    catch (error) { status(error.message, true); } finally { button.disabled = false; }
  });
  $('ic-save-variant').onclick = async () => {
    const button = $('ic-save-variant');
    try { button.disabled = true; persist(); const blob = await png('composition'); await API.addColorPNG(app, new File([blob], 'happy-' + app + '-variant-' + Date.now() + '.png', {type: 'image/png'}), draft); status('Новый вариант добавлен в материалы.'); }
    catch (error) { status(error.message, true); } finally { button.disabled = false; }
  };
  $('ic-export-draft').onclick = async () => {
    try {
      persist();
      const backgroundFile = await API.backgroundFile(app, draft.backgroundSourceId);
      download(new Blob([JSON.stringify({format: 'happy-icon-gradient', version: 1, app, draft, backgroundFile}, null, 2)], {type: 'application/json'}), 'happy-' + app + '-gradient.json');
      $('ic-file-menu').open = false; status('Настройки и загруженный фон сохранены в JSON.');
    } catch(error) { status(error.message, true); }
  };
  $('ic-import-draft').onchange = async event => {
    const currentApp=app,currentDraft=draft,session=opening;
    const current=()=>app===currentApp && draft===currentDraft && opening===session && !panel.hidden;
    try {
      const file = event.target.files?.[0]; if (!file) return; if (file.size > 12 * 1024 * 1024) throw Error('Файл настроек слишком большой');
      const data = JSON.parse(await file.text()); if (data.format !== 'happy-icon-gradient' || data.version !== 1 || !data.draft) throw Error('Неизвестный формат настроек');
      const next = clean({...data.draft,masterId:currentDraft.masterId});
      if (data.backgroundFile) {
        if (!/^data:image\/png;base64,[A-Za-z0-9+/]*={0,2}$/.test(data.backgroundFile.data || '')) throw Error('Повреждён PNG-фон в настройках');
        const bytes = Uint8Array.from(atob(data.backgroundFile.data.split(',')[1]), c=>c.charCodeAt(0));
        const png = await validateBackground(new File([bytes], String(data.backgroundFile.name || 'background.png'), {type:'image/png'}));
        if (!current()) return;
        const id=await API.addBackgroundPNG(currentApp,png); if(!current())return;
        next.backgroundSourceId=id; next.originalBackgroundSourceId=currentDraft.originalBackgroundSourceId;
      }
      if(!current())return;
      draft = next; dirty = true; await refreshSources(); backgroundEditor.set(draft.background); iconEditor.set(draft.icon); persist(); await loadSource(); $('ic-file-menu').open = false; status('Настройки восстановлены.');
    } catch (error) { if(current())status(error.message, true); } finally { event.target.value = ''; }
  };
  window.addEventListener('pagehide', persistIfOpen);
})();
