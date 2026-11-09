/* Unreleased read-only view. No journal/storage/cache writes or message bridge. */
import {createDaySportAuth} from './day-sport-auth.mjs';
import {createSportMeasurementReader} from './sport-measurement-reader.mjs';

const PAGE_SIZE = 25;
const messages = Object.freeze({
  idle:'Открой замеры и нажми «Прочитать из Sport».',
  loading:'Читаю зашифрованную облачную копию Sport…',
  missing:'Чтение не вернуло журнал Sport. Это не означает, что на устройстве Sport нет записей.',
  empty:'Журнал Sport прочитан. В этой облачной копии нет живых замеров.',
  unavailable:'Просмотр очищен. Нужен действующий вход Day в тот же аккаунт и с тем же паролем, что в Sport.',
  error:'Прочитать замеры не удалось. Данные не изменены.',
  disposed:'Просмотр закрыт.',
});
function fieldText(value) {
  if (Object.is(value, -0)) return '-0';
  if (value === null) return 'null';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}
export function mountDaySportView({host, document, screen, fetchRead, crypto,
  publishableKey, now = Date.now, deadlineMs = 20_000, timers = host}) {
  if (!screen || typeof fetchRead !== 'function') throw TypeError('Explicit host and read transport required');
  let disposed = false, selected = false, epoch = 0, page = 0, expiryTimer = null;
  const off = [];
  const make = (tag, text, parent, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    if (parent) parent.appendChild(node);
    return node;
  };
  const tabs = make('div', undefined, null, 'happy-measurement-tabs');
  tabs.setAttribute('role','group'); tabs.setAttribute('aria-label','Раздел журнала');
  const journalTab = make('button','Журнал',tabs);
  const sportTab = make('button','Замеры тела',tabs);
  journalTab.type = sportTab.type = 'button';
  const journal = make('div',undefined,null,'happy-journal-content');
  while (screen.firstChild) journal.appendChild(screen.firstChild);
  screen.append(tabs,journal);
  const panel = make('section',undefined,screen,'day-sport-readonly'); panel.hidden = true;
  make('p','Замеры Sport · только чтение',panel,'day-sport-candidate');
  make('p','Источник: облачная копия журнала Sport. Свежие изменения на другом устройстве могут ещё не попасть в облако. Для просмотра временно расшифровывается весь журнал Sport; здесь показываются только замеры. Входы приложений раздельные. Одинаковый UID без одинакового пароля не гарантирует совместимый ключ.',panel);
  const loadButton = make('button','Прочитать из Sport',panel,'btn'); loadButton.type = 'button';
  const cancelButton = make('button','Очистить просмотр',panel,'btn'); cancelButton.type = 'button';
  const status = make('p',messages.idle,panel); status.setAttribute('role','status'); status.setAttribute('aria-live','polite');
  const records = make('ol',undefined,panel,'day-sport-records');
  const paging = make('div',undefined,panel);
  const previous = make('button','Предыдущие',paging), next = make('button','Следующие',paging);
  previous.type = next.type = 'button'; paging.hidden = true;
  const visible = () => !disposed && selected && !panel.hidden && !screen.hidden && screen.classList.contains('on') && !document.hidden;
  let reader;
  function clear() {
    ++epoch;
    timers.clearTimeout(expiryTimer); expiryTimer = null;
    reader?.invalidate();
    records.replaceChildren(); page = 0; paging.hidden = true;
    loadButton.disabled = false;
    status.textContent = messages.unavailable;
  }
  const auth = createDaySportAuth({host, onInvalidate:clear});
  reader = createSportMeasurementReader({captureContext:auth.captureContext, fetchRead, crypto, publishableKey, now, deadlineMs});
  function invalidate() { auth.invalidate(); }
  function select(value) {
    invalidate(); selected = value;
    journal.hidden = value; panel.hidden = !value;
    journalTab.setAttribute('aria-pressed',String(!value)); sportTab.setAttribute('aria-pressed',String(value));
    status.textContent = messages.idle;
  }
  function armExpiry() {
    timers.clearTimeout(expiryTimer);
    try {
      const delay = auth.captureContext().session.exp - 60_000 - now();
      if (!Number.isFinite(delay) || delay <= 0) { invalidate(); return false; }
      const currentEpoch = epoch;
      expiryTimer = timers.setTimeout(() => { if (epoch === currentEpoch) invalidate(); },Math.min(delay,2_147_483_647));
      return true;
    } catch { invalidate(); return false; }
  }
  function paint() {
    records.replaceChildren(); paging.hidden = true;
    if (!visible()) { invalidate(); return; }
    const state = reader.getState(); // Never paint a retained read() result.
    status.textContent = messages[state.state] || messages.unavailable;
    if (state.state !== 'ready') return;
    const measurements = state.projection.measurements;
    page = Math.min(page,Math.floor((measurements.length - 1) / PAGE_SIZE));
    const start = page * PAGE_SIZE, end = Math.min(start + PAGE_SIZE,measurements.length);
    status.textContent = `Облачный снимок Sport: записи ${start + 1}–${end} из ${measurements.length}. Порядок и повторяющиеся даты сохранены.`;
    records.start = start + 1;
    for (const record of measurements.slice(start,end)) {
      const item = make('li',undefined,records);
      const fields = make('dl',undefined,item);
      for (const [key,value] of Object.entries(record)) {
        make('dt',key,fields);
        const target = make('dd',undefined,fields);
        if (key === 'values') {
          for (const [name,number] of Object.entries(value)) make('div',name+': '+fieldText(number),target);
        } else target.textContent = fieldText(value);
      }
    }
    previous.disabled = page === 0; next.disabled = end >= measurements.length;
    paging.hidden = measurements.length <= PAGE_SIZE;
  }
  async function load() {
    if (!visible() || loadButton.disabled) return;
    invalidate();
    if (!armExpiry()) return;
    const attempt = epoch;
    loadButton.disabled = true; status.textContent = messages.loading;
    await reader.read(); // Intentionally discard the returned projection/reference.
    if (disposed || attempt !== epoch || !visible()) return;
    loadButton.disabled = false;
    paint();
  }
  function navigate() { select(false); }
  function listen(target,type,fn) { target.addEventListener(type,fn); off.push(() => target.removeEventListener(type,fn)); }
  listen(journalTab,'click',() => select(false)); listen(sportTab,'click',() => select(true));
  listen(loadButton,'click',() => { void load(); }); listen(cancelButton,'click',invalidate);
  listen(previous,'click',() => { if (visible()) { --page; paint(); } });
  listen(next,'click',() => { if (visible()) { ++page; paint(); } });
  listen(document,'happy-show-journal',navigate);
  listen(document,'visibilitychange',() => { if (document.hidden) invalidate(); });
  listen(host,'storage',event => { if (event.key === null || event.key === 'happy-auth:day') invalidate(); });
  listen(host,'happy-profile-paused',invalidate);
  listen(host,'pagehide',navigate); listen(host,'pageshow',invalidate);
  listen(host,'popstate',navigate); listen(host,'hashchange',navigate);
  listen(host,'focus',() => { if (visible()) paint(); else invalidate(); });
  // Also fail closed if another current Day component changes screen visibility directly.
  const observer = host.MutationObserver ? new host.MutationObserver(() => { if (!visible()) invalidate(); }) : null;
  observer?.observe(screen,{attributes:true,attributeFilter:['class','hidden']});
  function dispose() {
    if (disposed) return;
    disposed = true; auth.dispose(); reader.dispose();
    for (const remove of off) remove(); observer?.disconnect();
    records.replaceChildren(); panel.hidden = true; journal.hidden = false;
    status.textContent = messages.disposed;
  }
  select(false);
  // No projection/session/key is exposed to other scripts or saved outside this closure.
  return Object.freeze({beginAuth:auth.beginAuth, invalidate, navigate, dispose});
}
