/* Happy studios account · v1 · one sign-in for Color Studio and Icon Studio.
   Own session key (happy_studio_cloud_v1), separate from the Happy Day / Meal / Sport session,
   which is never read or written here. Signing out ends only this session (scope=local).
   The same file is copied to icon-studio/ (self-contained bundle); scripts/check-studio-account.mjs keeps them identical. */
(function () {
  'use strict';
  if (window.HappyStudioAccount) return;
  const CFG = { url: 'https://geqziziycpclhnucnsyx.supabase.co', key: 'sb_publishable_I8tmZHGlz7CJn9SavbApCg_gg1G890r', session: 'happy_studio_cloud_v1' };
  const st = { s: null, listeners: new Set(), status: { text: '', kind: '' }, notice: '', opts: {}, button: null, sheet: null, view: '', returnFocus: null };
  const PERSON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8.4" r="3.6"/><path d="M4.8 19.6c1.4-3.3 4-5 7.2-5s5.8 1.7 7.2 5"/></svg>';
  const CSS = `
.hsa-btn{position:relative;display:inline-flex;align-items:center;gap:7px;min-height:38px;padding:4px 13px 4px 4px;border:1px solid #ffffff2e;border-radius:999px;background:#ffffff14;color:#fff;font:inherit;font-size:12.5px;font-weight:650;line-height:1;cursor:pointer;-webkit-tap-highlight-color:transparent}
.hsa-btn.is-in{padding:4px}
.hsa-btn.hsa-compact{padding:0}
.hsa-compact .hsa-avatar{width:28px;height:28px}
.hsa-btn.is-in .hsa-label,.hsa-btn.hsa-compact .hsa-label{display:none}
.hsa-avatar{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;flex:none;background:#ffffff1c;color:#fff;font-size:13px;font-weight:800;line-height:1}
.hsa-avatar svg{width:18px;height:18px}
.hsa-btn.is-in .hsa-avatar,.hsa-who .hsa-avatar{background:linear-gradient(135deg,#8e77df,#ff86b5)}
.hsa-compact:not(.is-in) .hsa-avatar{background:none}
.hsa-dot{position:absolute;right:0;bottom:0;width:11px;height:11px;border-radius:50%;border:2px solid #1d1a33;background:#7be3a1}
.hsa-dot[data-kind="busy"]{background:#ffd27a}.hsa-dot[data-kind="error"]{background:#ff7a9a}.hsa-dot[hidden]{display:none}
.hsa-backdrop{position:fixed;inset:0;z-index:150;display:flex;align-items:center;justify-content:center;padding:18px;background:#07061299;backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}
.hsa-backdrop[hidden]{display:none!important}
.hsa-sheet{position:relative;box-sizing:border-box;width:min(100%,380px);max-height:calc(100vh - 36px);overflow:auto;padding:20px 18px 18px;border:1px solid #ffffff2b;border-radius:20px;background:#27233f;color:#fff;box-shadow:0 24px 60px #000a;text-align:left;font-family:inherit;letter-spacing:normal;text-transform:none}
.hsa-x{position:absolute;top:10px;right:10px;width:34px;height:34px;padding:0;border-radius:50%;border:0;background:#ffffff14;color:#fff;font-size:20px;line-height:1;cursor:pointer}
.hsa-sheet h3{margin:0 42px 6px 0;font-size:17px;line-height:1.3;font-weight:750}
.hsa-sheet p{margin:0 0 12px;font-size:12.5px;line-height:1.55;color:#cbc5e0}
.hsa-sheet form{margin:0}
.hsa-sheet input{display:block;box-sizing:border-box;width:100%;margin:0 0 9px;padding:12px;border:1px solid #ffffff38;border-radius:12px;background:#ffffff14;color:#fff;font:inherit;font-size:16px;outline:none}
.hsa-sheet input:focus{border-color:#c4b0ff}
.hsa-sheet .hsa-error{color:#ffb3c7;margin:0 0 10px}
.hsa-sheet .hsa-error:empty{display:none}
.hsa-actions{display:grid;gap:8px;margin-top:4px}
.hsa-actions button{box-sizing:border-box;width:100%;min-height:44px;padding:10px 12px;border:1px solid #ffffff2e;border-radius:12px;background:#ffffff12;color:#fff;font:inherit;font-size:13px;font-weight:650;cursor:pointer}
.hsa-actions .primary{background:#e4dfff;border-color:#e4dfff;color:#342965;font-weight:750}
.hsa-actions .danger{background:#b4407d33;border-color:#e0679f8c;color:#ffd7ea}
.hsa-actions button:disabled{opacity:.5}
.hsa-who{display:flex;align-items:center;gap:12px;margin:0 42px 14px 0;min-width:0}
.hsa-who .hsa-avatar{width:44px;height:44px;font-size:18px}
.hsa-who strong{display:block;font-size:16px;line-height:1.3}
.hsa-who .hsa-email{display:block;font-size:12px;color:#bdb7d6;overflow-wrap:anywhere}
.hsa-status{display:flex;gap:8px;align-items:baseline;margin:0 0 10px;font-size:12.5px;line-height:1.45;color:#ece8fb}
.hsa-status[hidden]{display:none}
.hsa-status i{flex:none;width:8px;height:8px;border-radius:50%;background:#7be3a1}
.hsa-status[data-kind="busy"] i{background:#ffd27a}.hsa-status[data-kind="error"] i{background:#ff7a9a}
.hsa-sheet .hsa-note{font-size:11.5px;color:#aaa6c4}`;

  // ---- session ----
  function read() { try { const o = JSON.parse(localStorage.getItem(CFG.session) || 'null'); return o && o.at && o.rt && o.uid ? o : null } catch (e) { return null } }
  function save() { try { if (st.s) localStorage.setItem(CFG.session, JSON.stringify(st.s)); else localStorage.removeItem(CFG.session) } catch (e) { } }
  function sessionFrom(j) { const u = j.user || {}; return { at: j.access_token, rt: j.refresh_token, exp: Date.now() + (Number(j.expires_in) || 3600) * 1000, uid: u.id || st.s?.uid || '', email: u.email || st.s?.email || '', name: String(u.user_metadata?.display_name || st.s?.name || '').slice(0, 60) } }
  async function auth(path, body) {
    let r; try { r = await fetch(CFG.url + '/auth/v1/' + path, { method: 'POST', headers: { apikey: CFG.key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) } catch (e) { throw new Error('Нет связи с облаком') }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const m = String(j.error_description || j.msg || j.message || j.error || '');
      const e = new Error(/refresh/i.test(m) ? 'Вход устарел — войди снова' : /not confirmed/i.test(m) ? 'Почта не подтверждена — открой письмо Happy' : /invalid/i.test(m) ? 'Неверная почта или пароль' : r.status >= 500 ? 'Облако временно недоступно' : 'Облако отклонило вход (' + r.status + ')');
      e.auth = r.status >= 400 && r.status < 500; throw e;
    }
    if (!j.access_token || !j.refresh_token) throw new Error('Облако не выдало вход');
    return j;
  }
  async function token(force) {
    if (!st.s) { const e = new Error('Нет входа'); e.code = 'no-session'; throw e }
    const stored = read(); if (stored && stored.uid === st.s.uid && stored.exp > st.s.exp) st.s = stored; // the other studio already refreshed
    if (!force && Date.now() < st.s.exp - 60000) return st.s.at;
    try { st.s = sessionFrom(await auth('token?grant_type=refresh_token', { refresh_token: st.s.rt })) }
    catch (e) { if (e.auth) { st.s = null; st.notice = e.message; save(); emit() } throw e }
    save(); return st.s.at;
  }
  async function rest(table, method, query, body, prefer, again) {
    const headers = { apikey: CFG.key, Authorization: 'Bearer ' + await token(), 'Content-Type': 'application/json' }; if (prefer) headers.Prefer = prefer;
    let r; try { r = await fetch(CFG.url + '/rest/v1/' + table + (query || ''), { method, headers, body: body ? JSON.stringify(body) : undefined }) } catch (e) { throw new Error('Нет связи с облаком') }
    if (r.status === 401 && !again) { await token(true); return rest(table, method, query, body, prefer, true) }
    const text = await r.text(); let j = null; try { j = text ? JSON.parse(text) : null } catch (e) { }
    if (!r.ok) { const e = new Error(r.status === 409 ? 'conflict' : 'Облако ответило ошибкой ' + r.status); e.status = r.status; throw e }
    return j;
  }
  function emit() { render(); for (const f of st.listeners) { try { f(st.s) } catch (e) { console.error(e) } } }
  async function login(email, password) {
    st.s = sessionFrom(await auth('token?grant_type=password', { email: String(email).trim().toLowerCase(), password }));
    st.notice = ''; st.status = { text: '', kind: '' }; save(); emit(); return st.s;
  }
  function logout() {
    const t = st.s?.at; st.s = null; st.status = { text: '', kind: '' }; save(); emit();
    if (t) fetch(CFG.url + '/auth/v1/logout?scope=local', { method: 'POST', headers: { apikey: CFG.key, Authorization: 'Bearer ' + t } }).catch(() => { });
  }

  // ---- UI ----
  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) { if (k === 'text') n.textContent = v; else if (k.startsWith('on')) n[k] = v; else if (v !== false && v != null) n.setAttribute(k, v === true ? '' : v) }
    n.append(...kids.filter(Boolean)); return n;
  }
  const initial = s => ((s.name || s.email || '?').trim()[0] || '?').toUpperCase();
  function render() {
    const b = st.button;
    if (b) {
      const s = st.s, avatar = b.querySelector('.hsa-avatar'), dot = b.querySelector('.hsa-dot');
      b.classList.toggle('is-in', !!s);
      if (s) avatar.textContent = initial(s); else avatar.innerHTML = PERSON;
      b.setAttribute('aria-label', s ? 'Аккаунт Happy: ' + (s.name || s.email) : 'Войти в аккаунт Happy');
      b.title = s ? (s.name ? s.name + ' · ' : '') + s.email : 'Войти в аккаунт Happy';
      dot.hidden = !s || !st.status.kind; dot.dataset.kind = st.status.kind || '';
    }
    if (st.sheet && !st.sheet.hidden) renderSheet();
  }
  function renderSheet(force) {
    const body = st.sheet.querySelector('.hsa-body'), s = st.s, view = !s ? 'login' : st.view === 'confirm' ? 'confirm' : 'account';
    if (view === 'account' && !force && st.view === 'account') { updateStatus(); return }
    st.view = view; body.replaceChildren();
    if (view === 'login') {
      const err = el('p', { class: 'hsa-error', role: 'alert', text: st.notice });
      const email = el('input', { type: 'email', id: 'hsaEmail', autocomplete: 'username', inputmode: 'email', placeholder: 'Почта аккаунта Happy', required: true });
      const pw = el('input', { type: 'password', id: 'hsaPassword', autocomplete: 'current-password', placeholder: 'Пароль', required: true });
      const submit = el('button', { type: 'submit', class: 'primary', id: 'hsaSubmit', text: 'Войти' });
      const form = el('form', { id: 'hsaForm', novalidate: true }, email, pw, err, el('div', { class: 'hsa-actions' }, submit));
      form.onsubmit = async e => {
        e.preventDefault();
        if (!email.value.trim() || !pw.value) { err.textContent = 'Введи почту и пароль'; return }
        submit.disabled = true; err.textContent = '';
        try { await login(email.value, pw.value) } catch (x) { err.textContent = x.message } finally { submit.disabled = false }
      };
      body.append(el('h3', { id: 'hsaTitle', text: 'Аккаунт Happy' }),
        el('p', { text: 'Тот же аккаунт, что в Happy Day. Вход общий для Color Studio и Icon Studio и отдельный от Happy Day, Meal и Sport — их он не затрагивает.' }), form);
    } else if (view === 'confirm') {
      body.append(el('h3', { id: 'hsaTitle', text: 'Выйти из аккаунта в студиях?' }),
        el('p', { text: 'Работа останется на этом устройстве. Выход действует в Color Studio и Icon Studio; вход в Happy Day, Meal и Sport не изменится.' }),
        el('div', { class: 'hsa-actions' },
          el('button', { type: 'button', class: 'danger', id: 'hsaLogoutConfirm', text: 'Выйти', onclick: () => { st.view = ''; logout() } }),
          el('button', { type: 'button', id: 'hsaLogoutCancel', text: 'Отмена', onclick: () => { st.view = 'account'; renderSheet(true) } })));
    } else {
      const extra = (st.opts.actions || []).map(a => el('button', { type: 'button', class: a.primary ? 'primary' : '', text: a.label, onclick: () => a.onClick() }));
      body.append(el('div', { class: 'hsa-who' }, el('span', { class: 'hsa-avatar', 'aria-hidden': 'true', text: initial(s) }),
        el('div', {}, el('strong', { id: 'hsaTitle', text: s.name || 'Аккаунт Happy' }), el('span', { class: 'hsa-email', text: s.email }))),
        el('p', { class: 'hsa-status', id: 'hsaStatus', 'aria-live': 'polite' }, el('i'), el('span')),
        st.opts.note ? el('p', { class: 'hsa-note', text: st.opts.note }) : null,
        el('div', { class: 'hsa-actions' }, ...extra,
          el('button', { type: 'button', class: 'danger', id: 'hsaLogout', text: 'Выйти', onclick: () => { st.view = 'confirm'; renderSheet(true) } })));
      updateStatus();
    }
    focusFirst();
  }
  function updateStatus() {
    const p = st.sheet?.querySelector('#hsaStatus'); if (!p) return;
    p.hidden = !st.status.text; p.dataset.kind = st.status.kind || ''; p.querySelector('span').textContent = st.status.text;
  }
  function focusFirst() { requestAnimationFrame(() => { const t = st.sheet.querySelector('#hsaEmail') || st.sheet.querySelector('.hsa-actions button') || st.sheet.querySelector('.hsa-x'); t?.focus({ preventScroll: true }) }) }
  function buildSheet() {
    const sheet = el('div', { class: 'hsa-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'hsaTitle' },
      el('button', { type: 'button', class: 'hsa-x', 'aria-label': 'Закрыть', text: '×', onclick: close }), el('div', { class: 'hsa-body' }));
    const wrap = el('div', { class: 'hsa-backdrop', id: 'hsaSheet', hidden: true }, sheet);
    wrap.addEventListener('click', e => { if (e.target === wrap) close() });
    document.addEventListener('keydown', e => {
      if (wrap.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); close() }
      else if (e.key === 'Tab') {
        const items = [...wrap.querySelectorAll('button,input')].filter(x => !x.disabled), i = items.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus() } else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus() }
      }
    });
    document.body.append(wrap); st.sheet = wrap;
  }
  function open() { if (!st.sheet) buildSheet(); st.returnFocus = document.activeElement; st.view = ''; st.sheet.hidden = false; renderSheet(true) }
  function close() { if (!st.sheet || st.sheet.hidden) return; st.sheet.hidden = true; st.view = ''; try { st.returnFocus?.focus({ preventScroll: true }) } catch (e) { } }
  function mount(opts) {
    st.opts = opts || {};
    if (!document.getElementById('hsaStyles')) document.head.append(el('style', { id: 'hsaStyles', text: CSS }));
    if (!st.button) {
      st.button = el('button', { type: 'button', id: 'hsaButton', class: 'hsa-btn' + (st.opts.compact ? ' hsa-compact' : ''), onclick: open },
        el('span', { class: 'hsa-avatar', 'aria-hidden': 'true' }), el('span', { class: 'hsa-label', text: 'Войти' }), el('i', { class: 'hsa-dot', 'aria-hidden': 'true', hidden: true }));
    }
    st.opts.slot?.append(st.button); render();
  }
  function setStatus(text, kind) { st.status = { text: String(text || ''), kind: kind || '' }; render() }

  // Another studio tab signed in/out (emit) or only refreshed the tokens (quietly take the new ones).
  addEventListener('storage', e => {
    if (e.key !== CFG.session) return;
    const next = read(), changed = (next?.uid || '') !== (st.s?.uid || '');
    st.s = next; if (changed) emit(); else render();
  });
  st.s = read();
  window.HappyStudioAccount = { mount, open, close, login, logout, token, rest, setStatus, session: () => st.s, onChange: f => { st.listeners.add(f); return () => st.listeners.delete(f) } };
})();
