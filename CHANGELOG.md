# CHANGELOG — Speed Shear Entries / Entry Manager

This changelog records meaningful completed changes. Keep it current whenever functionality, workflow, deployment, URLs, email behaviour, privacy wording or architecture changes.

## 29 August 2026

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
- Live smoke testing of the new responsive controls remains to be completed after GitHub Pages publishes the change.

### Entry Manager — safe 30-second public-entry background refresh

- Added `entry-manager-live-refresh.js` and loaded it through `entry-manager-bootstrap.js` for token-based Entry Manager sessions.
- The manager checks the shared competition record every **30 seconds** for genuinely new public-entry competitors.
- Polling is silent: if nothing has changed, there is no page redraw, status message, flash or visible activity.
- A visible refresh is only requested when a new `source: public-entry` competitor ID is detected that is not already displayed.
- The refresh is deferred while the organiser is using an input/textarea/select, a dialog is open, a grade is being dragged, or Manual Entry/Bulk Entry draft text exists.
- This specifically protects unfinished competitor names and other typed text from the historical problem where polling could rebuild a roster UI and wipe a partially typed entry.
- When a pending refresh becomes safe, it uses the existing trusted Refresh Entries path so the internal Entry Manager state and displayed rows remain consistent.
- Scroll position is preserved around the refresh.
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
