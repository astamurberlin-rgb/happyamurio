import { marked, DOMPurify } from './format.js';
import { createDocumentTools } from './tools.js';
window.marked = marked; window.DOMPurify = DOMPurify;
(() => {
  "use strict";

  const API = "https://geqziziycpclhnucnsyx.supabase.co/functions/v1/files";
  const KEY_STORE = "happy-files:key";
  const SEEN_STORE = "happy-files:seen";
  const LAST_STORE = "happy-files:last";
  const GROUP_NAMES = { "health/psychotherapy": "Психотерапия", "personal": "Мои заметки", "health/nutrition": "Питание", "health/fitness": "Тренировки", "": "Общее" };
  const GROUP_ORDER = ["health/nutrition", "health/fitness"];

  const els = {
    status: document.getElementById("status"),
    top: document.querySelector(".top"),
    wrap: document.querySelector(".wrap"),
    ptr: document.getElementById("ptr"),
    ptrText: document.getElementById("ptr-text"),
    ptrSub: document.getElementById("ptr-sub"),
    chips: document.getElementById("chips"),
    main: document.getElementById("main"),
    forget: document.getElementById("forget")
  };

  const state = {
    docs: [], byPath: new Map(), badges: new Map(),
    currentPath: null, loadedAt: 0, loading: false, error: null, needKey: false
  };

  const fmtTime = new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" });

  function readRaw(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function writeRaw(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* optional */ } }
  function removeRaw(k) { try { localStorage.removeItem(k); } catch (e) { /* optional */ } }
  function readJson(k) { const v = readRaw(k); if (!v) return null; try { return JSON.parse(v); } catch (e) { return null; } }
  function writeJson(k, v) { writeRaw(k, JSON.stringify(v)); }

  let memoryKey = null; // used when the browser refuses storage
  function getKey() { return readRaw(KEY_STORE) || memoryKey; }
  function setKey(k) { memoryKey = k; writeRaw(KEY_STORE, k); }
  function dropKey() { memoryKey = null; removeRaw(KEY_STORE); }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function plural(n, one, few, many) {
    const a = n % 10, b = n % 100;
    if (a === 1 && b !== 11) return one;
    if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
    return many;
  }
  function keyFromText(text) {
    const t = String(text || "").trim();
    if (!t) return "";
    try {
      const u = new URL(t);
      const k = u.searchParams.get("key") || new URLSearchParams(u.hash.slice(1)).get("key");
      if (k) return k;
    } catch (e) { /* not a link */ }
    return t.replace(/^#?key=/, "");
  }

  function takeKeyFromHash() {
    const h = location.hash.slice(1);
    if (!h) return;
    const k = new URLSearchParams(h).get("key");
    if (!k) return;
    setKey(k);  // the key stays in the address so “Add to Home Screen” keeps it
  }

  function groupRank(folder) {
    const i = GROUP_ORDER.indexOf(folder);
    return i !== -1 ? i : (folder === "" ? 1000 : 500);
  }

  function toDocs(list) {
    if (!Array.isArray(list)) throw new Error("Сервер прислал не список файлов");
    return list
      .filter((r) => r && typeof r.path === "string" && typeof r.content === "string")
      .map((r) => {
        const cut = r.path.lastIndexOf("/");
        const folder = cut === -1 ? "" : r.path.slice(0, cut);
        const file = cut === -1 ? r.path : r.path.slice(cut + 1);
        const title = (typeof r.title === "string" && r.title.trim()) || file;
        const d = new Date(r.updated_at);
        return {
          path: r.path, folder, title,
          group: GROUP_NAMES[folder] ?? folder,
          short: title.split(/[:(]/)[0].trim() || title,
          content: r.content,
          version: Number(r.version) || 0,
          updatedAt: Number.isNaN(d.getTime()) ? null : d,
          updatedBy: typeof r.updated_by === "string" ? r.updated_by : ""
        };
      })
      .sort((x, y) => groupRank(x.folder) - groupRank(y.folder) || x.title.localeCompare(y.title, "ru"));
  }

  function computeBadges(docs) {
    const seen = readJson(SEEN_STORE);
    const out = new Map();
    if (!seen || typeof seen !== "object") {
      const base = {};
      for (const d of docs) base[d.path] = d.version;
      writeJson(SEEN_STORE, base);
      return out;
    }
    for (const d of docs) {
      if (!(d.path in seen)) out.set(d.path, "новый");
      else if (d.version > Number(seen[d.path])) out.set(d.path, "изменён");
    }
    return out;
  }
  function markSeen(d) {
    const seen = readJson(SEEN_STORE) || {};
    if (seen[d.path] !== d.version) { seen[d.path] = d.version; writeJson(SEEN_STORE, seen); }
  }

  function pickInitial() {
    const linked = new URL(location.href).searchParams.get("document");
    if (linked && state.byPath.has(linked)) return linked;
    const last = readRaw(LAST_STORE);
    if (last && state.byPath.has(last)) return last;
    const newest = [...state.docs].sort((x, y) => (y.updatedAt ? y.updatedAt.getTime() : 0) - (x.updatedAt ? x.updatedAt.getTime() : 0))[0];
    return newest ? newest.path : null;
  }

  function renderStatus() {
    const s = els.status;
    s.dataset.tone = "";
    if (state.loading) { s.textContent = state.docs.length ? "Обновляю…" : "Загружаю…"; return; }
    if (state.needKey) { s.textContent = "Нужен ключ доступа"; return; }
    if (state.error) {
      s.dataset.tone = "error";
      s.textContent = state.docs.length ? "Не удалось обновить · данные от " + fmtTime.format(state.loadedAt) : "Файлы не загружены";
      return;
    }
    if (state.loadedAt) {
      const n = state.docs.length;
      s.textContent = n + " " + plural(n, "файл", "файла", "файлов") + " · обновлено в " + fmtTime.format(state.loadedAt);
    }
  }

  function renderChips() {
    els.chips.textContent = "";
    for (const d of state.docs) {
      const card = el("div", "chip");
      card.setAttribute("aria-current", d.path === state.currentPath ? "true" : "false");
      const b = el("button", "chip-select"); b.type = "button";
      b.append(el("span", "chip-name", d.short));
      const badge = state.badges.get(d.path);
      if (badge) b.append(el("span", "pill", badge));
      b.addEventListener("click", () => select(d.path));
      card.append(b); els.chips.append(card);
    }
  }

  function renderMarkdown(md) {
    if (!window.marked || typeof window.marked.parse !== "function" || !window.DOMPurify) return el("div", "raw", md);
    const html = window.marked.parse(md, { gfm: true, breaks: true });
    const clean = window.DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ["style", "form", "button", "textarea", "select"],
      FORBID_ATTR: ["style"]
    });
    const box = el("div", "md");
    box.innerHTML = clean;
    box.querySelectorAll("table").forEach((t) => {
      const w = el("div", "table-wrap");
      t.parentNode.insertBefore(w, t);
      w.append(t);
    });
    box.querySelectorAll("a[href]").forEach((a) => {
      if ((a.getAttribute("href") || "").startsWith("#")) a.removeAttribute("href");
      else { a.setAttribute("rel", "noopener noreferrer"); a.setAttribute("target", "_blank"); }
    });
    return box;
  }

  function flash(button, ok, okText) {
    const label = button.dataset.label || (button.dataset.label = button.getAttribute("aria-label") || "");
    button.classList.remove("ok", "fail");
    button.classList.add(ok ? "ok" : "fail");
    button.setAttribute("aria-label", ok ? okText : "Не получилось скопировать");
    clearTimeout(button._flashTimer);
    button._flashTimer = setTimeout(() => {
      button.classList.remove("ok", "fail");
      button.setAttribute("aria-label", label);
    }, 1600);
  }
  function copy(text, button, okText) {
    try {
      navigator.clipboard.writeText(text).then(() => flash(button, true, okText), () => flash(button, false));
    } catch (e) { flash(button, false); }
  }

  const ICONS = {
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M15 9V5.5A2.5 2.5 0 0 0 12.5 3h-7A2.5 2.5 0 0 0 3 5.5v7A2.5 2.5 0 0 0 5.5 15H9"/>',
    link: '<path d="M10 14a4.5 4.5 0 0 0 6.36 0l3.18-3.18a4.5 4.5 0 0 0-6.36-6.36L12 5.64"/><path d="M14 10a4.5 4.5 0 0 0-6.36 0l-3.18 3.18a4.5 4.5 0 0 0 6.36 6.36l1.18-1.18"/>',
    done: '<path d="M5 12.5l4.5 4.5L19 7.5"/>'
  };
  function iconButton(name, label) {
    const b = el("button", "icon-btn");
    b.type = "button";
    b.title = label;
    b.setAttribute("aria-label", label);
    b.innerHTML = '<svg class="i-main" viewBox="0 0 24 24" aria-hidden="true">' + ICONS[name] + '</svg>'
      + '<svg class="i-done" viewBox="0 0 24 24" aria-hidden="true">' + ICONS.done + '</svg>';
    return b;
  }

  function keyCard(message) {
    const card = el("div", "card");
    card.append(el("h2", null, "Нужен ключ доступа"), el("p", null, message));
    const form = el("form", "key-form");
    const input = el("input", "key-input");
    input.id = "key-input";
    input.type = "text";
    input.autocomplete = "off";
    input.setAttribute("autocapitalize", "off");
    input.spellcheck = false;
    input.placeholder = "Ссылка с key=… или сам ключ";
    input.setAttribute("aria-label", "Ссылка или ключ доступа");
    const go = el("button", "btn primary", "Открыть");
    go.type = "submit";
    form.append(input, go);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const k = keyFromText(input.value);
      if (!k) { input.focus(); return; }
      setKey(k);
      state.needKey = false;
      load();
    });
    card.append(form);
    return card;
  }

  function messageCard(title, text, withRetry) {
    const card = el("div", "card");
    card.append(el("h2", null, title), el("p", null, text));
    if (withRetry) {
      const b = el("button", "btn primary", "Попробовать ещё раз");
      b.type = "button";
      b.addEventListener("click", () => load());
      card.append(b);
    }
    return card;
  }

  const ERRORS = {
    offline: ["Нет связи с сервером", "Проверь интернет и потяни экран вниз."],
    server: ["Сервер не смог прочитать файлы", "Попробуй через минуту."],
    parse: ["Не получилось разобрать ответ сервера", "Попробуй обновить страницу."]
  };

  function renderMain() {
    const main = els.main;
    main.textContent = "";
    if (state.needKey) {
      main.append(keyCard(state.error && state.error.code === "bad_key"
        ? "Этот ключ не подошёл. Вставь полную ссылку с ключом ещё раз."
        : "Открой полную ссылку с ключом или вставь её сюда. Ключ запомнится на этом устройстве."));
      return;
    }
    const d = state.byPath.get(state.currentPath);
    if (!d) {
      if (state.error) {
        const [t, p] = ERRORS[state.error.code] || ERRORS.server;
        main.append(messageCard(t, p, true));
      } else if (state.loadedAt && !state.docs.length) {
        main.append(messageCard("Файлов пока нет", "В базе нет ни одной записи.", false));
      } else {
        main.append(messageCard("Загружаю файлы…", "Дневник, упражнения и другие записи из общей базы happyday.", false));
      }
      return;
    }
    const paper = el("article", "paper");
    const inner = el("div", "paper-inner");
    const actions = el("div", "paper-actions");
    const copyText = iconButton("copy", "Скопировать текст");
    copyText.addEventListener("click", () => copy(d.content, copyText, "Текст скопирован"));
    const copyLink = iconButton("link", "Скопировать ссылку для ИИ с ключом доступа");
    copyLink.addEventListener("click", () => {
      const url = API + "/" + d.path.split("/").map(encodeURIComponent).join("/") + "?key=" + encodeURIComponent(getKey() || "");
      copy(url, copyLink, "Ссылка с ключом скопирована");
    });
    const more = iconButton("more", "Действия: " + d.title);
    more.setAttribute("aria-haspopup", "dialog");
    more.addEventListener("click", () => documentTools.openMenu(d));
    actions.append(copyText, copyLink, more);
    inner.append(actions, renderMarkdown(d.content));
    paper.append(inner);
    main.append(paper);
  }

  function render() {
    renderStatus();
    renderChips();
    renderMain();
    els.forget.hidden = !getKey();
  }

  function select(path) {
    const d = state.byPath.get(path);
    if (!d) return;
    state.currentPath = path;
    writeRaw(LAST_STORE, path);
    const u = new URL(location.href); u.searchParams.set("document", path); history.replaceState(null,"",u);
    markSeen(d);
    renderChips();
    renderMain();
    const top = els.main.getBoundingClientRect().top + window.scrollY - 12;
    if (window.scrollY > top) window.scrollTo(0, Math.max(0, top));
  }

  async function load() {
    if (state.loading) return;
    const key = getKey();
    if (!key) { state.needKey = true; render(); return; }
    state.loading = true;
    state.needKey = false;
    renderStatus();
    try {
      let res;
      try {
        res = await fetch(API + "?format=json&key=" + encodeURIComponent(key), { cache: "no-store" });
      } catch (e) {
        throw { code: "offline" };
      }
      if (res.status === 404) { dropKey(); throw { code: "bad_key" }; }
      if (!res.ok) throw { code: "server" };
      let data;
      try { data = await res.json(); } catch (e) { throw { code: "parse" }; }
      const docs = toDocs(data && data.documents);
      state.docs = docs;
      state.byPath = new Map(docs.map((d) => [d.path, d]));
      state.badges = computeBadges(docs);
      state.loadedAt = Date.now();
      state.error = null;
      if (!state.byPath.has(state.currentPath)) state.currentPath = pickInitial();
      const cur = state.byPath.get(state.currentPath);
      if (cur) { writeRaw(LAST_STORE, cur.path); markSeen(cur); }
    } catch (err) {
      const code = err && typeof err.code === "string" ? err.code : "parse";
      state.error = { code };
      if (code === "bad_key") {
        state.needKey = true;
        state.docs = []; state.byPath = new Map(); state.badges = new Map(); state.currentPath = null;
      }
    } finally {
      state.loading = false;
      render();
    }
  }

  // Pull to refresh: at the very top of the page drag down and release past the threshold.
  const PTR_SHOW = 70, PTR_MAX = 120, PTR_HOLD = 72;
  const ptr = { tracking: false, active: false, x: 0, y: 0, pull: 0 };
  function ptrPaint(distance, phase) {
    ptr.pull = distance;
    const shift = distance > 0 ? "translate3d(0," + Math.round(distance) + "px,0)" : "";
    els.top.style.transform = shift;   // the page follows the finger; the indicator shows in the gap above
    els.wrap.style.transform = shift;
    els.ptr.style.opacity = phase ? String(Math.min(1, distance / 40)) : "0";
    els.ptr.style.setProperty("--turn", String(Math.min(1, distance / PTR_SHOW)));
    els.ptr.dataset.phase = phase;
    els.ptrText.textContent = phase === "busy" ? "Обновляю…" : phase === "error" ? "Не удалось обновить"
      : phase === "ready" ? "Отпусти, чтобы обновить" : "Потяни, чтобы обновить";
    els.ptrSub.textContent = phase === "busy" || !state.loadedAt ? ""
      : (phase === "error" ? "данные от " : "обновлено в ") + fmtTime.format(state.loadedAt);
  }
  function ptrSettle(on) {
    for (const n of [els.ptr, els.top, els.wrap]) n.classList.toggle("settle", on);
  }
  function ptrRelease(refresh) {
    ptrSettle(true);
    if (refresh && ptr.pull >= PTR_SHOW && !state.loading) {
      ptrPaint(PTR_HOLD, "busy");
      load().finally(() => {
        const failed = !!state.error && state.docs.length > 0;
        if (failed) ptrPaint(PTR_HOLD, "error");
        setTimeout(() => ptrPaint(0, ""), failed ? 2500 : 300);
      });
    } else {
      ptrPaint(0, "");
    }
  }
  document.addEventListener("touchstart", (e) => {
    ptr.tracking = false;
    if (documentTools.isOpen() || state.loading || e.touches.length !== 1 || window.scrollY > 0) return;
    if (e.target.closest && e.target.closest("input, textarea, select, .chips, .table-wrap, pre")) return;
    ptr.tracking = true;
    ptr.active = false;
    ptr.x = e.touches[0].clientX;
    ptr.y = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener("touchmove", (e) => {
    if (!ptr.tracking) return;
    const t = e.touches[0], dx = t.clientX - ptr.x, dy = t.clientY - ptr.y;
    if (!ptr.active) {
      if (dy <= 0 || Math.abs(dx) > dy || window.scrollY > 0) { ptr.tracking = false; return; }
      ptr.active = true;
      ptrSettle(false);
    }
    if (e.cancelable) e.preventDefault(); // keep the page still and stop the browser's own pull-to-refresh
    const pull = Math.min(PTR_MAX, dy * 0.55);
    ptrPaint(pull, pull >= PTR_SHOW ? "ready" : "pull");
  }, { passive: false });
  function ptrEnd(refresh) {
    if (ptr.tracking && ptr.active) ptrRelease(refresh);
    ptr.tracking = false;
    ptr.active = false;
  }
  document.addEventListener("touchend", () => ptrEnd(true), { passive: true });
  document.addEventListener("touchcancel", () => ptrEnd(false), { passive: true });
  els.forget.addEventListener("click", () => {
    documentTools.onForget();
    dropKey();
    state.docs = []; state.byPath = new Map(); state.badges = new Map(); state.currentPath = null;
    state.error = null; state.needKey = true;
    render();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !documentTools.isOpen() && state.loadedAt && !state.loading && Date.now() - state.loadedAt > 60000) load();
  });
  window.addEventListener("hashchange", () => { takeKeyFromHash(); if (getKey()) load(); });

  const documentTools = createDocumentTools({el, getKey, api: API,
    receive(raw) {
      const [d] = toDocs([raw]);
      state.docs = [...state.docs.filter(x => x.path !== d.path), d].sort((x,y)=>groupRank(x.folder)-groupRank(y.folder)||x.title.localeCompare(y.title,"ru"));
      state.byPath = new Map(state.docs.map(x=>[x.path,x]));
      state.currentPath = d.path; state.loadedAt=Date.now(); markSeen(d); render();
    },
    notice(message) {
      const n=el("div","save-notice",message); n.role="status"; document.body.append(n); setTimeout(()=>n.remove(),3500);
    }
  });
  takeKeyFromHash();
  load();
})();
