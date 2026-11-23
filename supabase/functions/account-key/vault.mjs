// Vault retains the random project master. SQL derives a dedicated wrapping key
// for this owner and version only after validating the session and enrollment.
const bytes = str => Uint8Array.from(atob(str), ch => ch.charCodeAt(0));
const base64 = buffer => btoa(String.fromCharCode(...new Uint8Array(buffer)));

export function vaultEnvelope(project) {
  const wrapVersion = 2;
  async function kek(raw) {
    const data = bytes(raw);
    if (data.length !== 32) throw new Error('Invalid wrapping key');
    return crypto.subtle.importKey('raw', data, 'AES-GCM', false, ['encrypt','decrypt']);
  }
  function params(owner, version, iv) {
    const aad = JSON.stringify(['happy-account-key', project, owner, version, wrapVersion]);
    return {name:'AES-GCM', iv, additionalData:new TextEncoder().encode(aad), tagLength:128};
  }
  return {
    wrapVersion,
    async generate(owner, version, {wrappingKey}) {
      const key = crypto.getRandomValues(new Uint8Array(32));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(params(owner,version,iv), await kek(wrappingKey), key);
      const envelope = new Uint8Array(12 + encrypted.byteLength);
      envelope.set(iv);
      envelope.set(new Uint8Array(encrypted), 12);
      return {p_ciphertext:base64(envelope)};
    },
    async unwrap(owner, {ciphertext,wrappingKey,keyVersion}) {
      const envelope = bytes(ciphertext);
      if (envelope.length !== 60) throw new Error('Invalid wrapped key');
      const plain = await crypto.subtle.decrypt(params(owner,keyVersion,envelope.subarray(0,12)),
        await kek(wrappingKey), envelope.subarray(12));
      return base64(plain);
    }
  };
}
