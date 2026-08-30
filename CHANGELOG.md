# CHANGELOG — Speed Shear Entries / Entry Manager

This changelog records meaningful completed changes. Keep it current whenever functionality, workflow, deployment, URLs, email behaviour, privacy wording or architecture changes.

## 30 August 2026

### Entry Manager Version 9 — unified branded confirmed-roster PDF

- Simplified the Apps Script Close Entries PDF while retaining the Waimarino Shears branded layout.
- Removed **Booking Reference**, **File Version** and the former **BACKUP ROSTER** footer/explanatory text.
- Current PDF information block is Competition / Date and Venue / Submitted, followed by the grade/event confirmed count and `# / Competitor / Hometown` table.
- Rebuilt the ordinary per-grade **Download PDF** presentation to match the same branded Close Entries roster design while remaining a browser/local generator so it can still work offline.
- Because the two PDFs run in different environments, they remain separate technical generators, but their user-facing layout/content are intentionally aligned.
- Entry Manager frontend cache advanced to `waimarino-entry-manager-offline-v8` and bootstrap now loads the updated branded local-PDF source.
- GitHub Pages deployment for the branded local PDF completed successfully.
- Apps Script existing web-app deployment was updated to **Version 9**.
- Production verification passed for both paths using the Intermediate test roster with six confirmed competitors: the emailed Close Entries PDF and the ordinary Download PDF both displayed the branded roster correctly.

### Entry Manager Version 8 — Close Entries JSON/PDF roster repair

- Fixed a Close Entries attachment mismatch where the submitted grade correctly reported the confirmed competitor count but the branded PDF roster cells were blank.
- Added a single cleaned roster-row helper so generated Close Entries attachments use confirmed `{name,town}` rows consistently.
- Per-grade Close Entries / Update Closed Entries JSON attachment now matches the timing handover format: a plain top-level array containing only confirmed `{name,town}` rows.
- The generated JSON no longer includes Booking Reference, competition/submission metadata, timestamps, contact details, source/IDs/status flags or bearer tokens.
- The authenticated frontend-to-backend `speed_shear_roster_submission` request remains unchanged; only the generated timing attachment is simplified.
- Close All Entries current source maps the generated all-grades attachment to the existing multi-grade `roster_pack` shape; that specific generated all-grades attachment path has not yet been screenshot-tested after this change.
- PDF roster cells are explicitly rendered as black text and use the same cleaned roster rows as the JSON attachment.
- Existing Drive file creation, email delivery, grade submitted state and manager write-confirmation architecture were preserved.
- Apps Script existing web-app deployment was updated to **Version 8** for the initial repair, then later to Version 9 for the PDF presentation alignment above.
- Live production test passed: Intermediate produced six visible confirmed competitors in the emailed PDF and the matching simple `{name,town}` JSON attachment.

## 29 August 2026

### System Operator Portal Version 17 — responsive restyle + Postpone Competition

- Restyled the private System Operator Portal with a Waimarino Shears red / black / white design and embedded Waimarino Shears logo while preserving the existing central Drive data model, deposit controls and cancellation lifecycle.
- Added responsive layouts for phones, tablets/iPads, laptops/desktops and large/TV displays. Live checks were performed on desktop/laptop, iPad portrait/landscape and iPhone portrait/landscape.
- Large-screen header now uses three clear zones: logo left, page title centred and private-access indicator right. Phone portrait intentionally hides the private-access indicator to avoid crowding.
- Competition cards now use a red top edge plus stronger black outside border, clearer status badges, larger date/summary/operator labels, and centred Total Entries / Confirmed / Not Confirmed statistics.
- Search/filter/Refresh controls adapt by screen width. iPad portrait keeps Mark Deposit Paid / Postpone Competition / Cancel Competition on one equal-width row; phone portrait stacks operator actions full-width.
- Added **Postpone Competition** without adding a third main lifecycle status. A postponed competition remains **Active**, keeps the same central record, competitors, grades, Programme, Booking Reference, tokens and links, and displays a separate **POSTPONED** badge.
- Postponement records `postponedAt`, `originalDate`, `previousDate` and `postponementCount` in optional `operatorControl` metadata.
- For a saved custom `entrySettings.autoCloseAt`, the Postpone dialog explicitly supports **Move the closing time with the competition** or **Keep the existing closing time**. If no custom cutoff exists, the existing automatic date-derived rule continues to follow the changed competition date.
- Added validation so the postponed date must be a valid date later than the current competition date and cancelled competitions must be restored before postponement.
- Fixed Postpone-dialog presentation discovered during live testing: radio controls no longer inherit full-width generic input styling, horizontal overflow is constrained, and the orange closing-time preview is hidden while empty.
- Final production Portal deployment in this work sequence is **Version 17**. Portal access remains **Only myself**.
- End-to-end **Move closing time** test passed on the test competition: 18 Sep 2026 → 25 Sep 2026, with custom close 17 Sep 5:00 pm → 24 Sep 5:00 pm. Portal, Entry Manager and public competitor entry all agreed, and roster/grades/links remained intact.
- End-to-end **Keep existing closing time** test also passed: competition date changed again to 28 Sep 2026 while the saved close remained 24 Sep 2026 at 5:00 pm. Portal, Entry Manager and public competitor entry again agreed.

### Faster offline reconnect detection — live regression passed

- The earlier complete offline acceptance run proved the queue was safe but reconnect could take roughly **30–40 seconds** before syncing visibly began.
- Added `entry-manager-reconnect-fast.js` as a narrow recovery helper without changing queue ordering, write confirmation, central-refresh blocking or single-source-of-truth rules.
- While an offline queue exists or the real connectivity layer still reports offline, the helper retries recovery every **3 seconds**, plus short event-triggered bursts.
- Service-worker cache advanced to **`waimarino-entry-manager-offline-v7`** and caches the fast reconnect helper.
- Live iPad regression testing has now passed: after one offline competitor change, restoring internet began sync and returned the manager to Online in roughly **7 seconds**.
- The queued change persisted centrally and the verified queue ordering/source-of-truth protections were retained.

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
- That original acceptance run took roughly **30–40 seconds** before syncing began; the later fast-reconnect regression above reduced the observed reconnect-to-sync path to roughly 7 seconds.
- The verified reconnect probe remains the service-worker no-store request against `/entry-manager.html`; later cache versions retain that behaviour.

### Offline reconnect queue + offline reload repair

- Live iPad airplane-mode testing passed for consecutive offline Add, Confirmed/Not Confirmed, offline Remove, JSON download and the tidy confirmed-only PDF.
- The same test exposed two remaining handover failures: a full offline refresh stayed on **Opening the saved Entry Manager in offline mode…**, and reconnect left **11 saved changes** queued while the visible roster reverted to the older central/server copy.
- The 11-change indicator proved the offline queue itself had **not** been lost.
- Found a central-refresh race: the normal Entry Manager startup GET could still apply the central competition while offline changes were pending. `entry-manager-offline.js` now blocks central `action=entry-manager` setup GETs while the queue exists or is syncing.
- Queue replay remains ordered and uses the existing Version 7 confirmed-write wrapper. Only after the queue reaches zero may the existing controlled central refresh run.
- Added stronger reconnect triggers: browser `online`, window focus, `pageshow`, return from background and the heartbeat all attempt recovery. Backend reachability is checked separately from same-origin network reachability when necessary.
- Indicator explicitly reports **Online — syncing…** during replay and returns to **Online** only after real network/backend recovery and successful queue drain.
- Found a cache-version issue: an older cache could keep stale offline source running if the service-worker version was not advanced after manager-source edits. The versioned cache/registration rule is now documented and enforced.
- `manage/index.html` reveals the same-origin Entry Manager as soon as its cached DOM is rendered rather than waiting for the iframe's final external-resource load.
- Frontend-only repair; no Apps Script deployment required.

### Resilient offline Entry Manager architecture

- Airplane-mode testing proved the remaining data-loss behaviour was primarily an **offline-mode problem**, not a PDF-generator problem.
- `entry-manager-offline.js` performs a real small network probe before supported competitor-list writes rather than relying on `navigator.onLine` alone.
- Supported offline actions are deliberately limited to competitor-list work: Add/Bulk Add, name/town edits, details edits, Confirmed/Not Confirmed and Remove.
- Central competition controls such as Close Entries, Close All Entries, public-entry status/cutoff and grade settings/order still require internet.
- Queued writes replay one at a time in original order through the existing Version 7 confirmed-write wrapper and remain queued until confirmed.
- The 30-second public-entry refresh stays blocked while offline or while queued changes are pending/syncing.
- After the queue empties, one controlled central refresh occurs using existing typing/dialog/drag protection and scroll preservation.
- The tidy `/manage/?c=...` route caches the already-resolved manager token on the same device for a previously opened competition so the manager can reopen during an outage.
- Explicit lifecycle rejection such as cancelled/not-found remains authoritative and does not fall back to cached access.
- Central Google Drive JSON remains the **only permanent source of truth**.

### Offline PDF/export preservation and PDF cleanup

- `entry-manager-local-pdf.js` builds the roster directly from the currently visible grade table.
- At this historical stage the PDF was intentionally minimal: **confirmed competitors only**, competition name, grade/event, date, and aligned **No. / Name / Town** columns.
- Venue, Booking Reference, generated timestamp, summary counts, confirmation/source columns and offline markers were omitted.
- PDF generation is read-only and does not refresh/replace Entry Manager state.
- Live airplane-mode testing passed without roster loss.
- This historical plain layout was superseded on 30 August 2026 by the Version 9 unified branded roster presentation while retaining local/offline generation.

### Offline manual entry — consecutive-add flicker fix

- Airplane-mode testing found a repeatable pattern where one manual add worked, the next flickered/disappeared, retrying worked, and the following new add failed again.
- Root cause was the Confirmed/Awaiting grouping `MutationObserver` observing and retriggering its own row rearrangements.
- The grouping observer now disconnects before rearranging rows and reattaches only after the grouping pass is complete.
- Cache version moved to `entry-manager-entry-groups.js?v=1.0.1`.
- Follow-up airplane-mode testing successfully added four manual competitors consecutively.

### Initial offline competitor fallback and local PDF

- Added the first competition-specific offline queue and Offline status marker for competitor-list operations.
- Added local per-grade PDF generation and retained JSON as the machine-readable handover format.
- Added blocking of the 30-second background refresh while an offline queue is pending/syncing.
- This initial implementation was later hardened after live iPad testing exposed unreliable browser connectivity reporting and offline reload limitations.

### Online-entry closing countdown — refresh and simpler display

- Added the shared custom-closing countdown to Entry Manager and public competitor entry using the existing saved cutoff timestamp.
- More than 24 hours remaining shows days only; 24 hours or less shows hours and minutes; exact closing date/time remains underneath.
- Public page silently re-checks the cutoff every 5 minutes and when the page becomes visible again without rebuilding the form or touching typed competitor data.
- No Apps Script deployment required.

### Entry Manager competitor grouping, public grade polish and Programme repair

- Confirmed competitors are visually grouped separately from entries awaiting confirmation without changing stored sequence/draw order.
- Unlimited public grades no longer show unnecessary “No entry limit” wording.
- Public Grade/Event choice uses a Waimarino custom modal rather than the native browser picker.
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
- Live typing-protection test passed.

### Tidy manager/public routes — verified

- Preferred competition URLs are:
  - `https://entries.waimarinoshears.com/manage/?c=<20-char-code>`
  - `https://entries.waimarinoshears.com/enter/?c=<20-char-code>`
- Legacy short/full-token URLs remain supported.
- Tidy manager route and tidy public submission were verified end-to-end.

### Speed Shear Entry Manager Version 7 — confirmed manager writes

- Kept the Apps Script-compatible `no-cors` POST transport.
- Added unique manager-write request IDs and `GET action=manager-write-result`.
- Backend stores short-lived real success/error results in Apps Script Cache.
- Frontend waits for the real backend result rather than treating “request sent” as proof of save.
- Production smoke test passed with a Confirmed status change surviving refresh.

### Shared Booking Receiver ↔ Entry Manager secret rotated

- Rotated `ENTRY_MANAGER_SHARED_SECRET` in both Apps Script projects.
- Replacement value is intentionally absent from GitHub, documentation and chat.
- Existing competition links/tokens were not changed.

### System Operator Portal Version 6 — earlier baseline

- Portal Version 5 introduced tidy `/manage/` and `/enter/` links but accidentally removed `operatorPortalSort_()`, causing zero competition cards to display.
- Version 6 restored the exact sorting helper while retaining tidy link generation.
- Post-deploy portal refresh passed; central competition records were unaffected.
- This section is retained as history; the current production Portal is Version 17 as documented above.

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
