let database;
function open() {
  if (!database) database = new Promise((resolve, reject) => {
    const req = indexedDB.open('happy-notes-private-v2', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('items');
    req.onerror = () => { database = null; reject(req.error); };
    req.onsuccess = () => resolve(req.result);
  });
  return database;
}
export async function storage(action, key, value) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('items', action === 'get' ? 'readonly' : 'readwrite');
    const store = tx.objectStore('items');
    const req = action === 'put' ? store.put(value, key) : action === 'delete' ? store.delete(key) : store.get(key);
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = tx.onabort = () => reject(tx.error || new Error('Хранилище недоступно'));
  });
}
export async function fingerprint(text) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
