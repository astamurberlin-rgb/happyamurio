// Studio sign-in module: one implementation for Color Studio and Icon Studio, separate from Day/Meal/Sport.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const shared = read('shared/happy-studio-account.js');

assert.equal(read('icon-studio/happy-studio-account.js'), shared, 'icon-studio/happy-studio-account.js must be an exact copy of shared/happy-studio-account.js');
new vm.Script(shared, { filename: 'happy-studio-account.js' });
assert(!/hd_cloud_v1|app_sync/.test(shared), 'the studio account must not read or write the Happy Day/Meal/Sport session or app_sync');
assert(shared.includes("session: 'happy_studio_cloud_v1'"), 'the studios keep their own session key');
assert(shared.includes('/auth/v1/logout?scope=local'), 'signing out ends only the studio session');
assert(!shared.includes('innerHTML = s') && !/innerHTML\s*=\s*[^P]/.test(shared.replace("avatar.innerHTML = PERSON", '')), 'account data is written with textContent only');

for (const page of ['prototypes/happy-family-color-studio-v12.html', 'prototypes/studio.html']) {
  const html = read(page);
  assert(html.includes('<script src="../shared/happy-studio-account.js'), page + ' loads the shared account module');
  assert(html.includes('id="accountSlot"'), page + ' has the header account slot');
}
const icon = read('icon-studio/index.html');
assert(icon.includes('<script src="./happy-studio-account.js'), 'Icon Studio loads its copy of the account module');
assert(/HappyStudioAccount\.mount\(\{slot:document\.querySelector\('header\.top \.top-actions'\)/.test(icon), 'Icon Studio mounts the account button in the header actions');

console.log('PASS: one studio sign-in module (identical copy in icon-studio), own session key, logout scope=local, no Day/Meal/Sport session or app_sync, mounted in both studio headers.');
