# CHANGELOG — Speed Shear Entries / Entry Manager

This changelog records meaningful completed changes. Keep it current whenever functionality, workflow, deployment, URLs, email behaviour, privacy wording or architecture changes.

## 29 August 2026

### System Operator Portal Version 6 — restore missing sort helper

- Portal Version 5 was deployed at **5:33 AM** with the new tidy `/manage/` and `/enter/` link generation.
- On the first live refresh after that deployment, the portal showed `ReferenceError: operatorPortalSort_ is not defined` and displayed zero competitions.
- Root cause: the tidy-link source change accidentally removed the existing `operatorPortalSort_()` helper while leaving `competitions.sort(operatorPortalSort_)` in place.
- The failure occurred while preparing the competition list and did **not** modify or delete any central competition records.
- Restored the exact existing sort helper in `operator-portal/google-apps-script/Code.gs` while retaining the tidy link generation.
- Deployed **System Operator Portal Version 6** at **5:46 AM** using the existing Portal web-app deployment URL.
- Portal access remains **Only myself** and the existing lifecycle controls/custom dialogs are unchanged.
- Post-deploy refresh verification of Version 6 is the next check.

### Tidy competition-specific links — Apps Script deployments complete

- Deployed **Speed Shear Entry Manager Version 6** at **5:29 AM** using the existing Entry Manager web-app deployment URL.
- Version 6 retains all Version 5 lifecycle/cancellation/deletion guards and changes generated user-facing competition links to:
  - `https://entries.waimarinoshears.com/manage/?c=<20-char-code>`
  - `https://entries.waimarinoshears.com/enter/?c=<20-char-code>`
- Deployed **System Operator Portal Version 5** at **5:33 AM** using the existing Portal web-app deployment URL.
- Portal Version 5 remains **Only myself** and retains the already-tested Version 4 lifecycle controls and custom dialogs.
- Portal Version 5 changed generated URLs to `/manage/` and `/enter/`, but the missing sort-helper regression described above required the follow-up Version 6 repair.
- No competition tokens were changed.
- Manager/public short codes remain competition-specific and type-specific, and must resolve to exactly one token before the existing availability guard allows access.
- Legacy `m.html?c=...`, `e.html?c=...` and long-token links remain supported.
- The next verification is a Portal Version 6 refresh, followed by a safe public test entry through `/enter/?c=...` and a quick Portal-button check.

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

### Known open technical item

- Private manager writes still use `fetch(..., mode:'no-cors')`, so the organiser frontend cannot read/validate backend response bodies. The live lifecycle guard still blocks cancelled competition writes server-side.
