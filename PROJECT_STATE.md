# PROJECT STATE — Speed Shear Entries / Entry Manager

**Last updated:** 30 August 2026

This is the authoritative current-state handoff for future ChatGPT/Codex sessions.

## Working rule

Before making changes, read:

1. `README.md`
2. this file
3. `CHANGELOG.md`

Then inspect the exact current source involved. Every meaningful change must update this file and `CHANGELOG.md`; update `README.md` when architecture, deployment, public behaviour or important workflow changes.

Do not guess where code lives or replace Apps Script files with shortened/unverified versions.

## Project identity

Repository: `Turiedmonds/speed-shear-roster-builder`

Production domain: `https://entries.waimarinoshears.com`

Visible system names:

- public system: **Speed Shear Entries**
- private organiser area: **Entry Manager**
- public form: **Speed Shear Competitor Entry**
- Waimarino private admin: **System Operator Portal**

## Current live production baseline

As at 30 August 2026:

- GitHub Pages custom domain `entries.waimarinoshears.com` is active.
- **Speed Shear Entry Manager Apps Script: Version 9 live.**
- **System Operator Portal Apps Script: Version 17 live and user-verified.**
- System Operator Portal remains private with Apps Script access **Only myself**.
- Tidy manager/public URLs are live-verified.
- Full public competitor submission has been verified end-to-end.
- Safe 30-second Entry Manager background refresh is verified and protects typing/dialog/drag/offline-queue state.
- Offline competitor fallback has passed full iPad/Safari acceptance testing.
- Fast reconnect service-worker v7 passed its live timing regression: one queued offline competitor change synced and returned Online in roughly **7 seconds** after internet restoration. The current manager shell cache is now **v8** after the branded local-PDF update.
- Sanitized timing-roster JSON downloads are live-verified on iPad for both single-grade and Full Roster formats.
- Per-grade **Close Entries / Update Closed Entries** now generates a sanitized single-grade timing JSON attachment containing only confirmed `{name,town}` rows. The authenticated backend submission request remains unchanged.
- The repaired Close Entries JSON attachment and branded emailed PDF have been live-verified against the Intermediate test roster.
- The ordinary per-grade **Download PDF** now uses the same cleaned Waimarino branded roster presentation as the Close Entries PDF and has also been visually verified live.
- System Operator Portal responsive restyle is verified across desktop/laptop, iPad portrait/landscape and iPhone portrait/landscape.
- System Operator Portal **Postpone Competition** is fully verified end-to-end for both custom-cutoff choices: move the closing time or keep it unchanged.
- Booking Receiver ↔ Entry Manager `ENTRY_MANAGER_SHARED_SECRET` has been rotated. Never retrieve, print, expose, document or commit its value.

## Central source of truth

The **only permanent competition source of truth** is one JSON record per competition in Google Drive folder:

`Waimarino Speed Shear Entry Manager`

Records contain items including:

- Booking Reference;
- manager/public tokens;
- competition details;
- organiser details;
- grades/settings;
- Programme of Events;
- competitors;
- roster/submission state;
- optional operator-control metadata.

Do **not** create a second permanent competition database.

Offline browser snapshots and queued changes are temporary resilience data only. Once connectivity returns, supported queued changes replay through the existing confirmed-write path and the screen returns to the central record.

## Security boundary

- Never expose `ENTRY_MANAGER_SHARED_SECRET`.
- Never expose full manager/public bearer tokens in documentation, chat output or user-download roster JSON.
- The private System Operator Portal remains **Only myself**.
- Entry Manager/public endpoints are accessible using their existing token model because organisers and competitors need remote access.
- Explicit cancellation/deletion responses remain authoritative and must not be bypassed by cached offline state.

## Preferred competition links

User-facing links:

- organiser Entry Manager: `https://entries.waimarinoshears.com/manage/?c=<20-char-code>`
- public competitor form: `https://entries.waimarinoshears.com/enter/?c=<20-char-code>`

Manager and public short codes are type-specific and competition-specific. Legacy routes/full-token links remain supported internally for compatibility.

## Relationship to Booking Pack

Booking Pack repository:

`Turiedmonds/waimarino-shears-speed-shear-booking-pack`

The Booking Receiver sends authorised competition setup data into the central Entry Manager record. Booking Pack is the initial competition configuration stage; the System Operator Portal later operates on that same central record.

## Entry Manager — current behaviour

Current organiser functionality includes:

- booking-loaded competition details;
- grades/events and Programme viewer;
- manual/bulk/public competitors;
- competitor contact details;
- Confirmed / Not Confirmed;
- public-entry global/custom closing;
- per-grade online-entry controls and limits;
- grade reorder/collapse;
- Close Entries / Close All Entries / Update Closed Entries;
- branded local PDF and timing-roster JSON exports;
- safe background refresh;
- resilient offline competitor-list operation.

### Confirmed writes — Version 7 architecture retained

Manager writes retain Apps Script-compatible `no-cors` POST transport but use request IDs plus `GET action=manager-write-result` so the frontend waits for the real backend success/error result rather than assuming a request was saved.

Production confirmation-save testing passed. Later Apps Script deployments, including current Version 9, retain this confirmed-write architecture.

### Responsive/common organiser controls

Manual Add, Online Entries On/Off, entry-limit changes and common competitor edits update the relevant UI immediately while retaining backend confirmation/rollback behaviour and avoiding unnecessary whole-grade redraws.

### Confirmed / Awaiting grouping

Confirmed competitors are visually grouped separately from competitors still awaiting confirmation. This is display-only and does not change stored competitor sequence/draw order.

The grouping MutationObserver disconnects while rearranging rows, preventing the former every-second-offline-add flicker/disappearance. Consecutive offline additions were successfully retested.

### Programme

The Programme button opens the Programme supplied from the Booking Pack. The dynamic-loader initialization issue caused by loading after `DOMContentLoaded` has been repaired and user-verified.

## Online-entry closing countdown

Frontend sources include:

- `entry-manager-countdown.js`
- `competitor-entry-countdown.js`
- `entry-countdown.css`

Both Entry Manager and public competitor entry use the same existing saved `entrySettings.autoCloseAt`/public timestamp rather than a duplicate timer source.

Display rules:

- more than 24 hours: days only;
- 24 hours or less: hours and minutes;
- exact closing date/time shown underneath.

The public page silently re-checks setup every 5 minutes and when returning to visible state without rebuilding the form or touching typed competitor inputs.

## Safe 30-second Entry Manager refresh

`entry-manager-live-refresh.js` checks for genuinely new public competitors every 30 seconds.

Refresh is deferred while:

- an input/edit is active;
- a draft is in progress;
- a dialog is open;
- a grade is being dragged;
- real connectivity is offline;
- an offline queue exists or is syncing.

Scroll position is preserved and after an offline queue drains only one controlled central refresh is requested.

## Offline competitor mode

Important frontend files:

- `entry-manager-offline.js`
- `entry-manager-reconnect-fast.js`
- `entry-manager-offline.css`
- `entry-manager-sw.js`
- `entry-manager-bootstrap.js`
- `manage/index.html`
- `entry-manager-live-refresh.js`
- `entry-manager-local-pdf.js`
- `entry-manager-timing-export.js`

Offline support is intentionally limited to competitor-list work:

- Manual Add / Bulk Add;
- competitor name/town edits;
- competitor contact-detail edits;
- Confirmed/Not Confirmed;
- competitor removal.

Central settings such as Close Entries, public cutoff/status, grade settings/order remain online-only.

### Connectivity detection

Do not rely on `navigator.onLine` alone. The offline layer performs a real same-origin network probe, with service-worker handling that prevents cached content from falsely proving internet connectivity.

### Offline reload/startup

The service worker caches the known Entry Manager shell/assets. The tidy `/manage/?c=...` route caches the already-resolved manager token on that same device after a successful online load, allowing a previously opened competition to reopen during network failure.

Explicit cancelled/not-found lifecycle responses still block access and clear the cached mapping where appropriate.

Current service-worker cache:

`waimarino-entry-manager-offline-v8`

Every future Entry Manager source change that affects the cached shell must bump the service-worker cache and registration version.

### Reconnect/source-of-truth protection

While offline changes exist:

1. normal central setup refreshes are blocked from replacing the visible local roster;
2. queued writes replay one-by-one in original order through the confirmed-write wrapper;
3. an item remains queued until confirmed;
4. background refresh remains blocked;
5. after queue reaches zero, one controlled central refresh is permitted;
6. UI returns to green Online only after real network/backend recovery.

The full acceptance path passed on iPad/Safari: offline Add, Confirmed/Not Confirmed, Remove, JSON/PDF download, full offline browser refresh, reconnect, queue drain, final Online state and fresh online reload with central persistence.

### Fast reconnect v7 — verified

`entry-manager-reconnect-fast.js` supplements the existing recovery layer only when recovery is actually needed. It retries at a 3-second cadence plus short event-triggered bursts; overlapping attempts are coalesced by the existing reconnect promise.

Live regression on 29 August 2026 passed: after one offline competitor change, restoring internet began syncing and returned the manager Online in roughly **7 seconds**. Queue semantics and final central persistence remained intact.

## Confirmed roster PDF — unified branded presentation

There are still two technical PDF generators because they serve different environments:

- `entry-manager-local-pdf.js` builds the ordinary per-grade **Download PDF** locally from the visible roster and remains available offline;
- Apps Script `entryManagerBuildRosterPdf_()` builds the PDF attached by **Close Entries / Update Closed Entries**.

Their user-facing design and roster content are now intentionally aligned.

Verified current layout:

- Waimarino Shears logo;
- **WAIMARINO SHEARS INCORPORATED** branding;
- **Speed Shear Confirmed Entry Roster** title;
- competition name;
- competition date;
- venue;
- submitted time where available;
- grade/event and confirmed count;
- columns `# / Competitor / Hometown`;
- confirmed competitors only.

Intentionally removed from the PDF:

- Booking Reference;
- File Version;
- phone/email/source/status clutter;
- former **BACKUP ROSTER** footer and explanatory text.

Production verification on 30 August 2026 passed for both the emailed Close Entries PDF and the ordinary Download PDF using the Intermediate test roster with six confirmed competitors.

## Timing-system roster JSON handover

Contract:

`ROSTER-JSON-CONTRACT.md`

Per-grade **Download JSON**:

- plain top-level array;
- confirmed competitors only;
- rows contain only `{name,town}`.

**Download Full Roster**:

- `{ "type": "roster_pack", "rosters": { ... } }`;
- supplied grades contain confirmed `{name,town}` rows only.

Timing downloads exclude manager token, Booking Reference, competition metadata, phone/email, source, IDs, status flags and timestamps.

Both manual export formats have been screenshot-verified live on iPad.

### Close Entries generated JSON attachment — Version 8+ verified

The frontend-to-backend **Close Entries** request remains the existing authenticated `speed_shear_roster_submission` transport. Do not remove its access token or required submission metadata.

Inside Apps Script, the timing-system JSON attachment generated after a successful per-grade Close/Update is now deliberately simplified before writing/emailing:

- plain top-level array;
- confirmed competitors only;
- rows contain only `{name,town}`;
- no Booking Reference, competition metadata, timestamp, phone/email, IDs, source, confirmation flag or bearer token.

The PDF and JSON attachment are both generated from the same cleaned `{name,town}` roster rows, preventing the prior mismatch where the PDF count was correct but its competitor cells were blank.

Live test on 30 August 2026 passed for **Intermediate**: six confirmed competitors appeared in both the emailed PDF and simple JSON attachment in matching order.

**Close All Entries** uses the multi-grade `roster_pack` shape in the current source, but that generated all-grades attachment path has not yet been screenshot-tested after this alignment. Do not claim that specific path is live-verified until tested.

Matching Timing System importer changes are already committed in `Turiedmonds/SheariQ-Speed-Shear-Timing-System`, but the Raspberry Pi has **not yet pulled/tested them** because connectivity/VNC was unavailable. This remains the main outstanding integration test.

## System Operator Portal — Version 17 live

Source mirror:

- `operator-portal/google-apps-script/Code.gs`
- `operator-portal/google-apps-script/Index.html`
- `operator-portal/README.md`

The portal uses the same central Drive records and remains private.

### Current responsive styling

The current design uses Waimarino Shears red / black / white branding and logo.

Verified layout behaviour includes:

- desktop/laptop;
- iPad portrait/landscape;
- iPhone portrait/landscape;
- constrained maximum content width for large displays/TVs;
- three-zone larger-screen header: logo left, title centred, private-access indicator right;
- phone portrait hides the private-access indicator;
- search/filter/Refresh adapts by width;
- status badges are grouped consistently;
- competition cards have a red top edge and stronger black outside border;
- Total Entries / Confirmed / Not Confirmed are centred;
- iPad portrait keeps the three operator buttons on one equal-width row;
- phone portrait stacks operator actions full-width.

### Existing operator lifecycle/deposit controls

The portal supports:

- Awaiting Deposit / Deposit Paid;
- Active / Cancelled;
- Cancel Competition;
- Restore Competition;
- Delete Permanently only after cancellation;
- search/filter/refresh;
- tidy manager/public links.

Cancellation/deletion backend guarding remains unchanged. Delete moves the central JSON to Drive Trash.

### Postpone Competition — fully verified

Postponement does **not** create a new main lifecycle status. The competition remains Active and receives a separate POSTPONED badge.

The backend updates the existing central `competition.date` and preserves:

- competitors;
- grades/events;
- Programme;
- Booking Reference;
- manager/public tokens and links;
- existing competition settings except the explicitly chosen closing-time change.

Optional `operatorControl` postponement metadata:

- `postponedAt`;
- `originalDate`;
- `previousDate`;
- `postponementCount`.

If a custom `entrySettings.autoCloseAt` exists, the modal supports:

- **Move the closing time with the competition**;
- **Keep the existing closing time**.

If no custom cutoff exists, `autoCloseAt` stays blank and the existing automatic date-derived rule follows the changed competition date.

Validation requires a real new date later than the current competition date and prevents postponing while Cancelled.

Postpone-dialog fixes completed during live testing:

- radio buttons no longer inherit full-width generic input CSS;
- no horizontal dialog overflow;
- empty orange preview is hidden until preview text exists.

### Postpone acceptance tests

Test competition: **Speedshear o ngā Taniwha**, Booking Reference `WS-2026-0016`, Turangawaewae marae.

Move-cutoff test:

- 18 Sep 2026 → 25 Sep 2026;
- custom cutoff 17 Sep 2026, 5:00 pm → 24 Sep 2026, 5:00 pm;
- Portal remained Active + POSTPONED;
- Entry Manager and public form showed the new date/cutoff;
- roster, grades and links remained intact.

Keep-cutoff test:

- competition changed again to 28 Sep 2026;
- cutoff stayed 24 Sep 2026, 5:00 pm;
- Portal, Entry Manager and public page all reflected the intended state.

Both Postpone paths are therefore live-verified.

## Test competition current state

`Speedshear o ngā Taniwha` / `WS-2026-0016` is a test competition.

After Postpone testing its date is **28 September 2026** and its saved custom entry closing time remains **24 September 2026 at 5:00 pm**.

The Intermediate roster used for the 30 August export tests contained six confirmed test competitors. Test roster data is intentionally mutable.

## Remaining work / next planned work

1. Pull the already-committed Timing System roster-import changes onto the Raspberry Pi when connectivity is available.
2. Verify both Pi import paths:
   - single-grade plain `{name,town}` array;
   - Full Roster multi-grade `roster_pack`.
3. If the all-grades generated attachment will be used operationally, run one **Close All Entries** verification to confirm its current `roster_pack` JSON/PDF output after the Version 8/9 changes.
4. Keep the authenticated backend Close Entries request contract separate from the generated sanitized timing JSON attachment; never remove required backend authentication merely to simplify downloaded/attached roster files.
5. No further Portal styling is planned unless an actual usability/layout bug is found.
