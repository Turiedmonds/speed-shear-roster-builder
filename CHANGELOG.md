# CHANGELOG — Speed Shear Entries / Entry Manager

This changelog records meaningful completed changes. Keep it current whenever functionality, workflow, deployment, URLs, email behaviour, privacy wording or architecture changes.

## 29 August 2026

### Offline manual entry — consecutive-add flicker fix

- Airplane-mode testing found a repeatable pattern where one manual competitor add worked, the next add attempt flickered/disappeared, retrying that same name worked, and the following new add failed again.
- Root cause was in `entry-manager-entry-groups.js`: its `MutationObserver` rearranged Confirmed/Awaiting rows while continuing to observe the DOM mutations caused by those same row moves.
- The observer could therefore retrigger its own grouping work and repeatedly rearrange the competitor table, creating the visible flicker and a race with a new offline add.
- The grouping observer now disconnects before moving divider/competitor rows, performs one grouping pass, and reattaches only after the rearrangement is complete.
- Cache version bumped to `entry-manager-entry-groups.js?v=1.0.1` and the Entry Manager bootstrap cache was also bumped.
- No Apps Script deployment is required.
- Live verification still required: add at least four different competitors consecutively in airplane mode and confirm every first tap succeeds without table flicker.

### Entry Manager — offline manual-entry fallback and local PDF

- Added `entry-manager-offline.js` and `entry-manager-offline.css` as a narrow offline fallback for competitor-list work.
- If internet is lost after the Entry Manager has loaded, manual Add/Bulk Add, competitor name/town edits, details edits, Confirmed/Not Confirmed changes and competitor removal can continue locally instead of being rolled back.
- Offline competitor operations are queued per competition in localStorage and rows with unsynced changes receive an **Offline** marker.
- Added a clear Online/Offline/syncing indicator in the Entry Manager header.
- When connectivity returns, queued competitor changes replay automatically through the existing Version 7 confirmed manager-write path and are removed from the local queue only after successful confirmation.
- The 30-second public-entry background refresh now pauses while offline or while offline competitor changes are pending/syncing, preventing a remote refresh from overwriting unsynced local work.
- Global/grade control changes such as Close Entries, Close All Entries, public-entry closing settings and grade settings are intentionally **not** treated as successful offline; those still require the central backend.
- `entry-manager-bootstrap.js` can load previously cached competition state when the browser explicitly reports offline, provided the application files are available from browser cache.
- Added `entry-manager-local-pdf.js`: each grade's **Download PDF** now generates a real human-readable roster PDF directly on the device without Apps Script or internet.
- The local PDF includes all competitors in the grade, Confirmed/Not Confirmed status, Online/Manual source, queued Offline marker, competition details and summary totals.
- Existing JSON export remains the machine-readable handover; the PDF is the human-readable emergency roster.
- Fixed the competitor grouping divider spacing so the label and count no longer run together (for example `Confirmed 5` rather than `Confirmed5`).
- This entire change is frontend-only and requires no Apps Script deployment.
- Live airplane-mode and reconnect/sync smoke testing is still required after GitHub Pages publishes the change.

### Online-entry closing countdown — silent refresh and simpler display

- Public competitor page now silently re-checks the existing competition setup every **5 minutes** for a changed custom closing time.
- The re-check never reloads/rebuilds the page and never reads, clears or changes competitor form inputs; only the countdown timestamp/display is updated when the saved closing time changed.
- Background failures are silent and cannot interrupt entry submission.
- When the page becomes visible again after being in the background, it also performs one silent closing-time re-check.
- Countdown display is now intentionally simple on both Entry Manager and public page: **more than 24 hours remaining shows days only**; **24 hours or less shows hours and minutes**; the exact closing date/time remains displayed underneath.
- Cache versions were bumped for both countdown scripts.
- No Apps Script change or deployment is required.

### Online-entry closing countdown

- Added a lightweight custom-closing countdown to both the private Entry Manager and public competitor entry page.
- Both displays use the same already-saved custom `autoCloseAt` timestamp; no new backend field or Apps Script deployment is required.
- The Entry Manager countdown shows the live time remaining, the actual closing date/time, and how many grades are currently accepting online entries.
- The Entry Manager countdown is clickable and opens/focuses the existing custom closing-time setting.
- The public page shows the live time remaining and actual closing date/time near the competition header.
- Countdown ticking is local device-side arithmetic; the public page now supplements this with the controlled 5-minute silent re-check described above.
- Colour emphasis changes as closing approaches: normal, within 24 hours, within 6 hours, and closed.
- No custom countdown is shown when no custom closing time is configured; the existing default final shutdown logic remains unchanged.

### Entry Manager — competitor grouping, public grade polish and Programme repair

- User verified the new competitor-table grouping: Confirmed competitors are visually grouped separately from competitors still awaiting confirmation without changing the stored roster/draw order.
- User verified the public grade availability polish: grades without a limit no longer display “No entry limit”; they simply show as open for entries, while limited grades retain the useful count/places-left information.
- User verified the public Grade / Event chooser now uses the Waimarino custom modal rather than the native browser/iPad selector.
- Fixed the Entry Manager **Programme** button after a live test found it did nothing.
- Root cause: `entry-manager-workflow.js` is loaded dynamically after the document has already loaded, but its Programme wiring was waiting only for `DOMContentLoaded`, so the click handler was never attached.
- Workflow initialization now runs immediately when the document is already loaded, while retaining the normal `DOMContentLoaded` path when required.
- Cache-busting was updated and the user confirmed the Programme button now opens correctly.

### Entry Manager — responsive grade controls

- Changed each per-grade control heading from “Public entries for <grade>” to **`<Grade> — Online Entries`**.
- Changed the per-grade action buttons to simple **On / Off** controls.
- Manual **Add Competitor** now inserts the new competitor row and updates grade counts immediately instead of waiting for backend confirmation and then rebuilding the whole grade card.
- The quick-entry name/town fields clear immediately and focus returns to the competitor-name field for fast repeated manual entry.
- Version 7 backend confirmation is still required; if a manual-add save fails, the inserted row is removed and the typed values are restored.
- Per-grade Online Entries On / Off changes now update immediately without a whole-card redraw, with rollback if the backend save is rejected.
- Optional entry-limit changes update the grade summary immediately and roll back on failure.
- Existing competitor name/town edits no longer redraw the full grade after a successful save.
- Saving competitor phone/email details no longer redraws the full grade after the details dialog closes.
- Cache-busting versions were updated in `entry-manager-bootstrap.js` and `entry-manager.html` so the responsive source is loaded after GitHub Pages publishes it.
- No Apps Script backend change or deployment is required for this frontend-only update.

### Entry Manager — safe 30-second public-entry background refresh

- Added `entry-manager-live-refresh.js` and loaded it through `entry-manager-bootstrap.js` for token-based Entry Manager sessions.
- The manager checks the shared competition record every **30 seconds** for genuinely new public-entry competitors.
- Polling is silent: if nothing has changed, there is no page redraw, status message, flash or visible activity.
- A visible refresh is only requested when a new `source: public-entry` competitor ID is detected that is not already displayed.
- The refresh is deferred while the organiser is using an input/textarea/select, a dialog is open, a grade is being dragged, or Manual Entry/Bulk Entry draft text exists.
- This specifically protects unfinished competitor names and other typed text from the historical problem where polling could rebuild a roster UI and wipe a partially typed entry.
- When a pending refresh becomes safe, it uses the existing trusted Refresh Entries path so the internal Entry Manager state and displayed rows remain consistent.
- Scroll position is preserved around that refresh.
- Background network errors are ignored silently so polling cannot interrupt competition operation.
- Manual/no-token mode does not poll.
- **Live smoke test passed:** unfinished Manual Entry text remained untouched across polling, the new online competitor was held while the draft remained, and then appeared automatically once the manual competitor was added.

### Tidy public-entry route — end-to-end submission passed

- Submitted a test competitor through `https://entries.waimarinoshears.com/enter/?c=<20-char-code>`.
- The submission was accepted and returned an Entry Reference.
- The competitor receipt email was received successfully.
- The new competitor appeared under the correct grade in the matching competition's Entry Manager.
- This completes the remaining end-to-end verification for the tidy public-entry route.

### Tidy manager/public links — live verification passed

- Verified the private Entry Manager tidy route keeps `https://entries.waimarinoshears.com/manage/?c=<20-char-code>` visible and opens the correct competition.
- Verified the public competitor-entry tidy route keeps `https://entries.waimarinoshears.com/enter/?c=<20-char-code>` visible and opens the correct competition.
- Verification used a test competition, so no production competition data needed to be altered.
- No tokens or URLs were regenerated; this confirms the existing short-code resolver and published tidy routes are functioning as intended.

### Entry Manager Version 7 — confirmed manager-write results

- Deployed **Speed Shear Entry Manager Version 7** using the existing web-app deployment URL.
- Kept the Apps Script-compatible manager POST transport using `fetch(..., mode:'no-cors')`.
- Added a unique `requestId` to manager writes.
- Added `GET action=manager-write-result` to return the real backend success/error result for that request.
- Manager write results are stored briefly in Apps Script Cache and expire after 300 seconds.
- Cache keys use a SHA-256 digest of manager token + request ID rather than exposing the raw token in cache-key text.
- The frontend now sends the write, then polls for the actual backend result before treating the operation as confirmed.
- This replaces the old “request sent = assume saved” behaviour without changing the central competition data model.
- The pattern matches the already-proven send-then-confirm approach used by the public competitor form.
- **Production smoke test passed:** a competitor was changed from Not Confirmed to Confirmed, the page was refreshed, and the Confirmed state remained correctly saved after reload.

### Shared Booking Receiver ↔ Entry Manager secret rotated

- Rotated `ENTRY_MANAGER_SHARED_SECRET` in the **Speed Shear Entry Manager** Apps Script project.
- Rotated the same `ENTRY_MANAGER_SHARED_SECRET` in the **Waimarino Speed Shear Booking Receiver** Apps Script project.
- The replacement value is intentionally not recorded in GitHub, documentation or chat.
- No competition manager/public tokens or existing competition links were changed.
- No Apps Script deployment is required for a Script Property value change.
- The old exposed development secret is no longer the configured shared secret.

### System Operator Portal Version 6 — restore missing sort helper

- Portal Version 5 was deployed at **5:33 AM** with the new tidy `/manage/` and `/enter/` link generation.
- On the first live refresh after that deployment, the portal showed `ReferenceError: operatorPortalSort_ is not defined` and displayed zero competitions.
- Root cause: the tidy-link source change accidentally removed the existing `operatorPortalSort_()` helper while leaving `competitions.sort(operatorPortalSort_)` in place.
- The failure occurred while preparing the competition list and did **not** modify or delete any central competition records.
- Restored the exact existing sort helper in `operator-portal/google-apps-script/Code.gs` while retaining the tidy link generation.
- Deployed **System Operator Portal Version 6** at **5:46 AM** using the existing Portal web-app deployment URL.
- Portal access remains **Only myself** and the existing lifecycle controls/custom dialogs are unchanged.
- Post-deploy refresh verification passed: the active competition list and competition card loaded normally again with no ReferenceError.

### Tidy competition-specific links — Apps Script deployments complete

- Deployed **Speed Shear Entry Manager Version 6** at **5:29 AM** using the existing Entry Manager web-app deployment URL.
- Version 6 retained all Version 5 lifecycle/cancellation/deletion guards and changed generated user-facing competition links to:
  - `https://entries.waimarinoshears.com/manage/?c=<20-char-code>`
  - `https://entries.waimarinoshears.com/enter/?c=<20-char-code>`
- Deployed **System Operator Portal Version 5** at **5:33 AM** using the existing Portal web-app deployment URL.
- Portal Version 5 remained **Only myself** and retained the already-tested Version 4 lifecycle controls and custom dialogs.
- Portal Version 5 changed generated URLs to `/manage/` and `/enter/`, but the missing sort-helper regression described above required the follow-up Version 6 repair.
- **System Operator Portal Version 6 is the current live Portal deployment.**
- No competition tokens were changed.
- Manager/public short codes remain competition-specific and type-specific, and must resolve to exactly one token before the existing availability guard allows access.
- Legacy `m.html?c=...`, `e.html?c=...` and long-token links remain supported.

## 28 August 2026

### Tidy competition-specific links — GitHub Pages published

- Published the new `/enter/` and `/manage/` routes on `entries.waimarinoshears.com`.
- Added `enter/index.html` and `manage/index.html` as same-origin shells that resolve the 20-character competition-specific code while keeping the tidy short URL visible.
- Kept full manager/public tokens internal to the application.
- Updated legacy `e.html?c=...` to forward to `/enter/?c=...` and `m.html?c=...` to forward to `/manage/?c=...`.
- Updated Entry Manager Copy Link behaviour to normalise current competition public links to `/enter/?c=...`.
- GitHub Pages deployment completed successfully.

### Entry Manager — Close Entries update user-verified

- Replaced organiser-facing **Submit Confirmed Entries** wording with **Close Entries** and **Close All Entries**.
- Previously closed grades show **Update Closed Entries** when an updated roster needs to be sent.
- Updated confirmation wording to describe closing public entries and sending the confirmed roster to Waimarino Shears without unnecessary technical JSON language.
- Changed Manual Entry helper text to: **“Add competitor entries manually if they were not received through the online entry form.”**
- Changed Checked / Paid confirmation so the clicked button colour/text and Confirmed count update immediately while the central save continues.
- Removed the full grade-card redraw from the confirmation toggle path, eliminating the previous visible flicker.
- Reduced the desktop/tablet width of the grade Close Entries button while retaining full-width mobile behaviour.
- User smoke-tested the live changes and reported they were working well.

### Normal browser profile — verified

- Created a dedicated Microsoft Edge profile named **Waimarino Shears**.
- Left Microsoft/Edge sync unsigned-in and signed Google into that profile only with the authorised Waimarino Shears Google account.
- Verified the private System Operator Portal opens normally without InPrivate.
- Portal access remained **Only myself**.

### System Operator Portal Version 4 — custom dialogs deployed and verified

- Deployed **System Operator Portal Version 4** on 28 August 2026 at 7:23 PM using the existing deployment URL.
- Replaced browser-native Cancel / Restore / Delete confirmations with uniform Waimarino custom dialogs.
- Safely smoke-tested the live **Cancel Competition** dialog on a real active competition and chose **Keep Competition**, leaving the competition unchanged.

### Operator lifecycle controls — verified end-to-end

- Added **Awaiting Deposit / Deposit Paid** status.
- Added Active / Cancelled state, **Cancel Competition**, **Restore Competition** and **Delete Permanently** after cancellation.
- Permanent delete moves the central competition JSON file to Google Drive Trash.
- Added active/cancelled filtering and fixed no-limit grade display.
- Completed the full lifecycle on a disposable Entry Manager Test Competition:
  - Deposit Paid / Awaiting Deposit changes worked.
  - Cancel blocked manager/public access.
  - Restore reactivated the same competition and the same links.
  - Delete removed the record from the Portal.
  - old manager/public links remained blocked after deletion.
- The disposable test competition was permanently removed; do not repeat destructive lifecycle testing on real bookings.

### Speed Shear Entry Manager Version 5 — lifecycle guard

- Deployed **Speed Shear Entry Manager Version 5** using the existing web-app URL.
- Added `OperatorControlGuard.gs` and updated `WebApp.gs`.
- Cancelled competitions are rejected server-side for manager access, public entry access, manager/public writes and short-code resolution.
- Trashed/deleted competition records are rejected.
- Stale Booking Reference mappings to trashed files are cleared before a legitimate recreation.
- Added frontend `entry-manager-bootstrap.js` validation so cancelled/deleted manager links cannot display stale cached organiser controls.
- Production testing confirmed cancelled and deleted manager links show **Competition unavailable**.

### Public competitor entry V4

- Privacy version set to **28 August 2026**.
- Public form requires competitor name plus at least one contact method.
- Added per-entry references, competitor receipt email, organiser New Competitor Entry email and Waimarino Shears backup copy where applicable.
- Duplicate submissions do not resend notifications.

### System naming and custom domain

- Visible system branding standardised as **Speed Shear Entries**, **Entry Manager**, and **Speed Shear Competitor Entry**.
- Added and verified `entries.waimarinoshears.com` custom domain.
- Added initial short-link resolver flow and retained legacy full-token compatibility.

### End-to-end verification baseline

Using **WS-2026-0016 — Speedshear o ngā Taniwha**:

- Booking Pack handoff created the competition record.
- Private Entry Manager opened correctly.
- Public competitor entry opened correctly.
- Online entries saved and appeared in manager.
- Competitor receipt, organiser notification and Waimarino Shears backup email worked.
- Custom domain and legacy redirects passed.