/* UNRELEASED integration entry. QA uses a separate, synthetic-only bootstrap. */
import {mountDaySportView} from './day-sport-view.mjs';
const host = globalThis, screen = document.querySelector('[data-screen="trends"]');
if (screen && !host.DaySportMeasurements) {
  // Existing guarded Day fetch remains in force. No refresh/auth/store helper is called.
  host.DaySportMeasurements = mountDaySportView({host, document, screen,
    fetchRead:(url,options) => host.fetch(url,options), crypto:host.crypto,
    publishableKey:host.CLOUD.key});
}
