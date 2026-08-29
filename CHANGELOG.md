# CHANGELOG — Speed Shear Entries / Entry Manager

This changelog records meaningful completed changes. Keep it current whenever functionality, workflow, deployment, URLs, email behaviour, privacy wording or architecture changes.

## 29 August 2026

### Faster offline reconnect detection

- Live acceptance testing had already proved the offline queue was safe and persisted centrally, but reconnect could take roughly **30–40 seconds** before syncing visibly began.
- Added `entry-manager-reconnect-fast.js` as a narrow recovery helper without changing queue ordering, write confirmation, central-refresh blocking or the single-source-of-truth rules.
- While an offline queue exists or the real connectivity layer still reports offline, the helper retries recovery every **3 seconds** instead of waiting only for the existing 12-second heartbeat.
- `online`, `focus`, `pageshow`, return from background and queue-change events now also trigger a short reconnect burst at 0 ms, 800 ms, 1.8 s and 3.5 s. The existing reconnect promise coalesces overlapping attempts, so duplicate queue replay cannot start.
- Service-worker cache advanced to **`waimarino-entry-manager-offline-v7`** and now caches the fast reconnect helper. Both manager registrations now request v7 with `updateViaCache:'none'`.
- This is frontend-only; Apps Script remains Version 7 and no backend deployment is required.
- Live iPad reconnect timing still needs one regression test after GitHub Pages publishes v7.

### Timing-system JSON handover + multi-grade contract

- Traced the live Timing System roster importer before changing the Entry Manager export format.
- Confirmed the existing single-grade Timing System importer expects a plain JSON array whose rows contain only `{name, town}`.
- Confirmed the Entry Manager's old **Download JSON** reused the backend `speed_shear_roster_submission` payload, so it contained unrelated metadata and the private manager bearer token and was not directly compatible with the Timing System importer.
- Added `entry-manager-timing-export.js` as a local export-only compatibility layer. It does **not** change the backend submission transport used by Close Entries.
- Per-grade **Download JSON** now exports confirmed competitors only as a plain `{name,town}` array.
- **Download Full Roster** now exports the minimal multi-grade package `{type:"roster_pack",rosters:{...}}`, again containing confirmed `{name,town}` rows only.
- Timing-roster downloads exclude the manager access token, booking reference, competition metadata, phone/email, source, competitor IDs, confirmation flags and timestamps.
- Added `ROSTER-JSON-CONTRACT.md` to record the exact machine-readable handover contract.
- Matching Timing System repository change adds multi-grade `roster_pack` import while retaining single-grade array import. Multi-grade import only replaces grades that already exist in the Timing System setup.
- Entry Manager service-worker cache advanced to **`waimarino-entry-manager-offline-v6`** and now caches the timing exporter so the sanitized downloads remain available offline.
- Apps Script backend version remains Version 7; no Apps Script deployment is required for this export change.
- Live Entry Manager exports were verified on iPad: the single-grade file contained only confirmed `{name,town}` rows and the Full Roster file contained only the expected `roster_pack` grade structure with no manager token or unrelated metadata. Raspberry Pi import still awaits the later `git pull` and live import test.

### Offline acceptance test completed

- Final iPad/Safari acceptance testing passed the complete handover path: offline detection, consecutive manual Add, Confirmed/Not Confirmed, offline Remove, JSON download, local confirmed-only PDF, full browser refresh while still offline, reconnect, ordered queue drain, green Online state and a final fresh online reload.
- The offline refresh preserved Test A/Test B as Confirmed, Test C remained removed, and the pre-existing unconfirmed competitor remained Not Confirmed.
- Reconnect showed **Online — syncing 6 saved changes**, counted the queue down to zero and finished at green **Online**.
- A fresh online browser refresh then proved the final roster had persisted centrally rather than existing only in local storage.
- Reconnect took roughly **30–40 seconds** before syncing began. This did not cause data loss, but the delay is recorded for later tuning.
- The verified reconnect fix is service-worker v5's real no-store probe against `/entry-manager.html`; later cache versions retain that behaviour.

### Offline reconnect queue + offline reload repair

- Live iPad airplane-mode testing passed for consecutive offline Add, Confirmed/Not Confirmed, offline Remove, JSON download and the tidy confirmed-only PDF.
- The same test exposed two remaining handover failures: a full offline refresh stayed on **Opening the saved Entry Manager in offline mode…**, and reconnect left **11 saved changes** queued while the visible roster reverted to the older central/server copy.
- The 11-change indicator proved the offline queue itself had **not** been lost.
- Found a central-refresh race: the normal Entry Manager startup GET could still apply the central competition while offline changes were pending. `entry-manager-offline.js` now blocks central `action=entry-manager` setup GETs while the queue exists or is syncing.
- Queue replay remains ordered and uses the existing Version 7 confirmed-write wrapper. Only after the queue reaches zero may the existing controlled central refresh run.
- Added stronger reconnect triggers: browser `online`, window focus, `pageshow`, return from background and the heartbeat all attempt recovery. Backend reachability is checked separately from same-origin network reachability when necessary.
- Indicator now explicitly reports **Online — syncing…** during replay and returns to **Online** only after real network/backend recovery and successful queue drain.
- Found a cache-version issue: service-worker v3 was cache-first but the cache name had not been advanced after later offline-source edits, allowing an older cached `entry-manager-offline.js` to keep running. Cache rebuilt as **`waimarino-entry-manager-offline-v4`**, deleting older Entry Manager caches.
- `manage/index.html` no longer keeps a usable cached manager hidden until the iframe's final `load` event. It now reveals the same-origin Entry Manager as soon as its DOM is rendered, preventing a slow/unavailable external resource from leaving the page stuck on the opening card.
- Manager/service-worker registrations use `updateViaCache:'none'` and the versioned service-worker URL so the browser checks the current worker source.
- Frontend-only repair; no Apps Script deployment required.

### Resilient offline Entry Manager architecture

- Airplane-mode testing proved the remaining data-loss behaviour was primarily an **offline-mode problem**, not a PDF-generator problem.
- Root cause: the first offline wrapper relied too heavily on `navigator.onLine`. On iPad/Chrome the browser can still report an available connection after usable internet has disappeared, causing competitor writes to enter the normal Version 7 confirmation path, wait, then roll back.
- Added `entry-manager-sw.js`, a versioned service worker that pre-caches the known Entry Manager application shell/assets required to reopen the manager during an outage.
- Connectivity probes are explicitly excluded from the service-worker cache so cached files cannot falsely make the app think the internet is available.
- `entry-manager-offline.js` v2 now performs a small real-network probe before supported competitor-list writes. If that probe fails, the operation is queued locally rather than sent into the online confirmation path.
- Supported offline actions remain deliberately limited to competitor-list work: Add/Bulk Add, name/town edits, details edits, Confirmed/Not Confirmed and Remove.
- Central competition controls such as Close Entries, Close All Entries, public-entry status/cutoff and grade settings/order still require internet and are not faked as successful offline.
- Queued writes replay one at a time in their original order through the existing Version 7 confirmed-write wrapper.
- Queue entries are removed only after confirmed success; exact accidental double-tap duplicate queue writes are suppressed.
- The 30-second public-entry refresh remains blocked while offline or while queued changes are pending/syncing.
- After the queue becomes completely empty, `entry-manager-live-refresh.js` requests one controlled central refresh. Existing typing/dialog/drag protection and scroll preservation still apply before that refresh can run.
- Updated the Online/Offline indicator to follow the real connectivity layer rather than relying only on the browser flag.
- The tidy `/manage/?c=...` route now caches the already-resolved manager token on the same device after a successful online resolution.
- If the short-code resolver later cannot be reached because of network/timeout failure, a previously opened competition can reopen using that cached token and its saved local competition state.
- `entry-manager-bootstrap.js` now also permits cached startup after an unreachable live validation even when the browser incorrectly still claims it is online.
- Explicit lifecycle rejection such as cancelled/not-found remains authoritative and does not fall back to cached access; the tidy route removes its cached mapping if the resolver explicitly rejects the link.
- Central Google Drive JSON remains the **only permanent source of truth**. The local competition snapshot and ordered queue are temporary offline working/recovery data only.
- Frontend-only architecture change; no Apps Script deployment was required.

### Offline PDF/export preservation and PDF cleanup

- Follow-up airplane-mode testing confirmed four manual competitors could be added consecutively and all could be marked Confirmed while offline.
- The generated PDF contained the expected competitors, but names later disappeared from the Entry Manager because the old connectivity path could still enter the online confirmation/rollback flow.
- `entry-manager-local-pdf.js` now builds the roster directly from the currently visible grade table.
- PDF is intentionally minimal: **confirmed competitors only**, competition name, grade/event, date, and aligned **No. / Name / Town** columns.
- Removed venue, Booking Reference, generated timestamp, summary counts, confirmation/source columns and offline markers.
- PDF generation is treated as read-only and is not intended to refresh/replace Entry Manager state.
- A short export guard prevents the 30-second background refresh from running around the PDF viewer handoff.
- No Apps Script deployment required.

### Offline manual entry — consecutive-add flicker fix

- Airplane-mode testing found a repeatable pattern where one manual add worked, the next flickered/disappeared, retrying worked, and the following new add failed again.
- Root cause was the Confirmed/Awaiting grouping `MutationObserver` observing and retriggering its own row rearrangements.
- The grouping observer now disconnects before rearranging rows and reattaches only after the grouping pass is complete.
- Cache version moved to `entry-manager-entry-groups.js?v=1.0.1`.
- Follow-up airplane-mode testing successfully added four manual competitors consecutively, confirming this specific every-second-add bug was fixed.

### Initial offline competitor fallback and local PDF

- Added the first competition-specific offline queue and Offline status marker for competitor-list operations.
- Added local per-grade PDF generation and retained JSON as the machine-readable handover format.
- Added blocking of the 30-second background refresh while an offline queue is pending/syncing.
- This initial implementation was later hardened by the resilient offline architecture above after live iPad testing exposed unreliable browser connectivity reporting and offline reload limitations.

### Online-entry closing countdown — refresh and simpler display

- Added the shared custom-closing countdown to Entry Manager and public competitor entry using the existing saved cutoff timestamp.
- More than 24 hours remaining shows days only; 24 hours or less shows hours and minutes; exact closing date/time remains underneath.
- Public page silently re-checks the cutoff every 5 minutes and when the page becomes visible again without rebuilding the form or touching typed competitor data.
- No Apps Script deployment required.

### Entry Manager competitor grouping, public grade polish and Programme repair

- Confirmed competitors are visually grouped separately from entries awaiting confirmation without changing stored sequence/draw order.
- Unlimited public grades no longer show unnecessary “No entry limit” wording.
- Public Grade/Event choice now uses a Waimarino custom modal rather than the native browser picker.
- Fixed the Programme button initialization bug caused by loading its script after `DOMContentLoaded`; user verified the repaired Programme button.

### Entry Manager responsive controls

- Per-grade public-entry controls changed to **`<Grade> — Online Entries`** with simple **On / Off** actions.
- Manual Add, entry-limit changes and common competitor edits update the relevant UI immediately while retaining Version 7 backend confirmation/rollback.
- Removed unnecessary whole-grade redraws from common confirmed-save paths.
- User smoke-tested the responsive changes successfully.

### Safe 30-second public-entry background refresh

- Added silent 30-second checks for genuinely new public competitors.
- Polling defers while the organiser is typing/editing, a dialog is open, a grade is being dragged, or an offline queue is pending/syncing.
- Scroll position is preserved around the controlled Refresh Entries path.
- Live typing-protection test passed: unfinished Manual Entry text was preserved and a new public entry appeared automatically once editing finished.

### Tidy manager/public routes — verified

- Preferred competition URLs are now:
  - `https://entries.waimarinoshears.com/manage/?c=<20-char-code>`
  - `https://entries.waimarinoshears.com/enter/?c=<20-char-code>`
- Legacy short/full-token URLs remain supported.
- Tidy manager route verified against the correct competition.
- Tidy public route verified end-to-end through competitor submission, receipt email and appearance in the correct Entry Manager grade.

### Speed Shear Entry Manager Version 7 — confirmed manager writes

- Kept the Apps Script-compatible `no-cors` POST transport.
- Added unique manager-write request IDs and `GET action=manager-write-result`.
- Backend stores short-lived real success/error results in Apps Script Cache using a SHA-256-derived cache key.
- Frontend no longer treats “request sent” as proof of save; it waits for the actual backend result.
- Production smoke test passed with a Confirmed status change surviving refresh.

### Shared Booking Receiver ↔ Entry Manager secret rotated

- Rotated `ENTRY_MANAGER_SHARED_SECRET` in both Apps Script projects.
- Replacement value is intentionally absent from GitHub, documentation and chat.
- Existing competition links/tokens were not changed and no Apps Script deployment was required for the Script Property update.

### System Operator Portal Version 6

- Portal Version 5 introduced tidy `/manage/` and `/enter/` links but accidentally removed `operatorPortalSort_()`, causing zero competition cards to display.
- Version 6 restored the exact sorting helper while retaining tidy link generation.
- Post-deploy portal refresh passed; central competition records were unaffected.
- Portal remains restricted to **Only myself**.

## 28 August 2026

### System Operator Portal lifecycle controls

- Added Awaiting Deposit / Deposit Paid state.
- Added Active / Cancelled lifecycle, Cancel, Restore and permanent Delete after cancellation.
- Permanent delete moves the central competition JSON to Drive Trash.
- Full disposable-competition lifecycle test passed, including manager/public blocking on cancel, same-link restoration, permanent deletion and stale-link blocking after deletion.

### Speed Shear Entry Manager lifecycle guard

- Added server-side cancellation/deletion checks for manager/public access and writes.
- Added frontend manager validation before organiser scripts load, preventing stale cached organiser UI while online.
- Production cancellation/deletion tests passed.

### Public competitor entry V4

- Privacy version set to 28 August 2026.
- Requires competitor name plus at least one contact method.
- Added per-entry references, competitor receipt email, organiser notification and Waimarino Shears backup copy where applicable.
- Duplicate submissions do not resend notifications.

### Entry Manager organiser wording and confirmation UI

- Replaced “Submit Confirmed Entries” with **Close Entries**, **Close All Entries**, and **Update Closed Entries** for previously closed grades.
- Updated Manual Entry helper wording.
- Confirmed/Not Confirmed visual changes became immediate without a whole-card redraw.
- User smoke-tested the live update successfully.

### Normal browser profile for private portal

- Dedicated Waimarino Shears Edge profile verified with only the authorised Google account signed in.
- Private System Operator Portal opens normally without InPrivate while remaining **Only myself**.

### Custom domain and system naming

- Standardised visible system names as **Speed Shear Entries**, **Entry Manager**, and **Speed Shear Competitor Entry**.
- Added and verified `entries.waimarinoshears.com`.
- Booking Pack → central competition → Entry Manager → public competitor entry end-to-end baseline verified using the test competition.
