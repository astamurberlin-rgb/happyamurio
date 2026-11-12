import { merge } from 'node-diff3';

export function mergeText(base, local, remote) {
  if (local === base) return { text: remote, conflict: false };
  if (remote === base || local === remote) return { text: local, conflict: false };
  const result = merge(local.split('\n'), base.split('\n'), remote.split('\n'));
  return { text: result.result.join('\n'), conflict: result.conflict };
}
export function appendEntry(content, entry, date = new Date()) {
  const stamp = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', day:'2-digit',month:'2-digit',year:'numeric' }).format(date);
  const block = `## ${stamp}\n\n${entry.trim()}\n\n<small>— Астамур · ${stamp}</small>\n\n`;
  const first = content.match(/^# [^\n]*(?:\n|$)/);
  return first ? first[0].trimEnd() + '\n\n' + block + content.slice(first[0].length).trimStart() : block + content;
}
export function safeFilename(title, ext) {
  return (title.replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ').trim().slice(0, 100) || 'Happy Notes') + '.' + ext;
}
export function documentLink(path, href) {
  const url = new URL(href); url.search = ''; url.hash = '';
  url.searchParams.set('document', path); return url.href;
}
export function readEnvelope(text) {
  const match = text.match(/^<!-- happy-notes (\{[^\n]*\}) -->\r?\n/);
  if (!match) return { content: text.replace(/^\uFEFF/, ''), metadata: null };
  try { return { content: text.slice(match[0].length).replace(/^\r?\n/, ''), metadata: JSON.parse(match[1]) }; }
  catch { return { content: text, metadata: null }; }
}
