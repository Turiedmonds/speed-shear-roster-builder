# CHANGELOG — Speed Shear Entries / Entry Manager

This changelog records meaningful completed changes. Keep it current whenever functionality, workflow, deployment, URLs, email behaviour, privacy wording or architecture changes.

## 28 August 2026

### Tidy competition-specific links — GitHub Pages published

- GitHub Pages deployment containing the new `/enter/`, `/manage/`, legacy forwarders and Entry Manager tidy Copy Link changes completed successfully.
- The tidy public and manager routes are therefore published on `entries.waimarinoshears.com` and are ready for browser smoke testing.
- Apps Script Version 5 / Portal Version 4 remain the current live Apps Script deployments; their repository URL-generation changes still require separate later redeployments to make newly generated email/portal link strings use `/enter/` and `/manage/` directly.

### Tidy competition-specific links — source implemented

- Added preferred public route: `https://entries.waimarinoshears.com/enter/?c=<20-char-code>`.
- Added preferred private organiser route: `https://entries.waimarinoshears.com/manage/?c=<20-char-code>`.
- Added `enter/index.html` and `manage/index.html` as same-origin shells that resolve the competition-specific 20-character code, load the existing long-token application internally, and keep the tidy short URL visible in the browser.
- Kept the full manager/public tokens internal; the tidy URL exposes only the existing 20-character short code.
- Preserved competition binding: public codes resolve only against `entryPublicToken_...`; manager codes resolve only against `entryManagerToken_...`; the resolver still requires exactly one match and applies the Version 5 lifecycle/availability guard.
- Updated legacy `e.html?c=...` to forward to `/enter/?c=...`.
- Updated legacy `m.html?c=...` to forward to `/manage/?c=...`.
- Existing old short links therefore remain valid and automatically end up on the cleaner route.
- Legacy full-token links remain supported.
- Updated Entry Manager frontend tidy helper so the displayed/copied Public Entry Link is normalised to `/enter/?c=...`, even while the current live backend Version 5 still returns an old `e.html` or long-token URL.
- Updated `google-apps-script/WebApp.gs` repository source so the next backend deployment generates `/manage/` and `/enter/` directly for booking handoffs and future returned links.
- Updated `operator-portal/google-apps-script/Code.gs` repository source so the next Portal deployment generates `/manage/` and `/enter/` directly.
- The Apps Script URL-generation source changes are **not yet live** until those two Apps Script projects are redeployed; the GitHub Pages routes/forwarders do not require those redeployments to work.

### Entry Manager — Close Entries update user-verified

- User smoke-tested the live Entry Manager after the Close Entries/smoother confirmation update and reported that it is working well.
- Treat the Manual Entry helper wording, **Close Entries / Close All Entries** labels, Checked / Paid immediate state update and narrower desktop grade action as production-smoke-tested.

### Entry Manager — Close Entries wording and smoother confirmation UI

- Replaced organiser-facing **Submit Confirmed Entries** wording with normal Speed Shear industry language: **Close Entries** for a grade and **Close All Entries** for the overall action.
- Previously closed grades now show **Update Closed Entries** when an updated confirmed roster needs to be sent.
- Updated the close-entry confirmation to explain that the grade will close to new public entries and the confirmed roster will be sent to Waimarino Shears.
- If competitors are not Confirmed, the warning now lists them and offers **Close Entries Anyway** rather than technical submission wording.
- Kept the existing backend submission payload, JSON/PDF generation and Waimarino Shears handoff unchanged.
- Changed the Manual Entry helper text to: **“Add competitor entries manually if they were not received through the online entry form.”**
- Changed Checked / Paid confirmation handling so the clicked button colour/text and the grade Confirmed count update immediately while the existing central save continues.
- Removed the full grade-card `render()` from the Checked / Paid toggle path, eliminating the previous delayed colour change and visible card/page flicker.
- Reduced the desktop/tablet width of the grade **Close Entries** button so it sizes to its label with sensible padding/minimum width; it remains full width on small/mobile layouts.
- Bumped Entry Manager frontend asset versions in `entry-manager.html` / `entry-manager-bootstrap.js` so browsers fetch the updated JS/CSS.
- This is a GitHub Pages frontend change only; no Entry Manager Apps Script redeployment was required for that UI update.
- Production browser smoke testing subsequently passed as recorded above.

### Normal browser profile — verified

- Created a dedicated Microsoft Edge profile named **Waimarino Shears** for normal Operator Portal use.
- Left Microsoft/Edge sync unsigned-in so the profile remains separate from the personal Edge profile.
- Signed Google into that profile only with the authorised Waimarino Shears Google account.
- Opened the private System Operator Portal successfully in a normal browser window.
- InPrivate is therefore no longer required for normal portal use.
- Portal access remains **Only myself**; the fix is browser account separation, not weaker Apps Script access.

### System Operator Portal Version 4 — custom dialog verified

- Safely smoke-tested the live Version 4 **Cancel Competition** confirmation on the real **Speedshear o ngā Taniwha** competition.
- Confirmed the browser-native Apps Script popup is gone and the uniform Waimarino Shears custom dialog is displayed instead.
- Verified the narrow/mobile layout: white rounded card, Waimarino red top accent, dark overlay, branded heading, explanatory detail, **Keep Competition** and red **Cancel Competition** actions.
- The destructive action was not confirmed, so the real competition remained unchanged.
- Version 4 custom-dialog presentation is therefore live and visually verified.

### System Operator Portal Version 4 — deployed

- Deployed **System Operator Portal Version 4** successfully on **28 August 2026 at 7:23 PM** using the existing web-app deployment.
- Portal access remains **Only myself** and the existing deployment URL is retained.
- Version 4 is the popup-only frontend update: `Code.gs` is unchanged from the live lifecycle logic.
- Cancel Competition, Restore Competition and Delete Permanently now use the custom Waimarino Shears confirmation dialog rather than Apps Script/browser-native `confirm()` popups.
- The underlying tested lifecycle calls and server-side behavior are unchanged.
- Safe live smoke test subsequently passed as recorded above.
- Repository `Code.gs` has since received the tidy `/manage/` and `/enter/` URL-generation change, which is pending a new Portal deployment.

### Uniform Waimarino dialogs — portal source updated

- Audited the current Entries / Entry Manager / Public Competitor Entry / Operator Portal frontend popup behaviour.
- Confirmed organiser **Entry Manager** already uses custom `<dialog>` confirmation/workflow screens and does not use browser-native confirmation boxes for its current workflows.
- Confirmed **Speed Shear Competitor Entry** already uses a custom privacy dialog and no browser-native confirmation path was found.
- Identified the remaining native browser popups in the **System Operator Portal**: Cancel Competition, Restore Competition and Delete Permanently.
- Updated `operator-portal/google-apps-script/Index.html` so those three actions now use a uniform Waimarino Shears custom dialog.
- New dialog presentation uses a white rounded card, Waimarino red top accent, dark overlay, consistent action layout and red destructive confirmation.
- The existing tested portal server calls and lifecycle logic are unchanged.
- The updated source was subsequently deployed as **System Operator Portal Version 4** and the Cancel dialog was visually verified live.
- InPrivate is not required by the portal security model. Recommended normal use is a dedicated browser profile signed only into the authorised Waimarino Shears Google account while retaining **Only myself** portal access.

### Operator lifecycle verification — complete

- Completed the full lifecycle test on **Entry Manager Test Competition**.
- Awaiting Deposit → Deposit Paid worked.
- Deposit Paid → Awaiting Deposit worked.
- **Cancel Competition** worked and removed the competition from the Active list.
- The cancelled public competitor-entry link was blocked.
- The cancelled private Entry Manager link was blocked after the cached-screen bootstrap fix, showing **Competition unavailable** rather than loading cached organiser controls.
- **Restore Competition** worked and returned the same competition to Active.
- The same private manager and public competitor-entry links both worked again after restore.
- The competition was cancelled again and **Delete Permanently** succeeded.
- The Cancelled filter dropped to 0 and the normal portal list dropped from 3 competitions to 2.
- After permanent deletion, the old private manager link remained blocked with **Competition unavailable**.
- After permanent deletion, the old public competitor-entry link also remained blocked.
- The deposit/cancel/restore/delete lifecycle and stale-link protection are therefore verified end-to-end.
- The test competition has now been permanently removed as intended; do not repeat destructive testing on real bookings.

### Operator permanent delete verification — portal side passed

- Re-cancelled **Entry Manager Test Competition** after the successful Restore test.
- **Delete Permanently** succeeded after the required confirmation.
- The Cancelled filter changed to 0 competitions immediately after deletion.
- The normal portal list dropped from 3 competitions to 2, confirming the deleted test competition no longer appears in the central portal listing.
- Final stale-link blocking was subsequently verified in the completed lifecycle test above.

### Operator restore verification — passed

- On **Entry Manager Test Competition**, **Restore Competition** was confirmed working after a prior cancellation.
- The competition returned to the Active portal list.
- The same private Entry Manager link worked again after restore.
- The same public competitor-entry link worked again after restore.
- This confirms Restore reactivates the same central record and existing tokens/links rather than creating replacements.

### Cancelled Entry Manager cached-screen fix — verified

- Lifecycle testing confirmed the public competitor link was correctly blocked after cancellation.
- Testing also found an already-resolved `entry-manager.html?access=...` URL could still display its previously cached localStorage organiser screen after cancellation.
- The Version 5 backend was already rejecting the manager token and manager writes; the problem was frontend behaviour in `entry-manager.js`, which restored cached state before its server refresh and only showed a warning when that refresh failed.
- Added `entry-manager-bootstrap.js`.
- Updated `entry-manager.html` so the organiser application stays hidden until the manager token is validated against the live backend.
- For token-based manager links, normal Entry Manager scripts now load only after successful validation.
- Cancelled/deleted/unavailable manager access prevents the organiser application from loading and removes the token-specific cached localStorage copy.
- Manual/no-token mode retains its previous local-only behaviour.
- Production re-test on **Entry Manager Test Competition** confirmed the cancelled manager link now shows **Competition unavailable** and no organiser controls/data are loaded.
- Post-delete re-test also confirmed the old manager link remains unavailable after the central record is moved to Google Drive Trash.

### Operator lifecycle controls — live deployments and initial test

- Deployed **Speed Shear Entry Manager Version 5** while retaining the existing web-app URL.
- Version 5 includes `OperatorControlGuard.gs` plus the updated `WebApp.gs` lifecycle checks.
- Cancelled competitions are rejected server-side for manager access, public entry access, manager/public writes and short-code resolution.
- Trashed/deleted central competition files are rejected.
- Stale Booking Reference mappings to trashed files are cleared before a legitimate recreation.
- Deployed **System Operator Portal Version 2** as an intermediate deployment containing the updated `Code.gs` only.
- Deployed **System Operator Portal Version 3** after saving the updated `Index.html`; Version 3 contained both updated lifecycle-control portal files.
- **System Operator Portal Version 4** was subsequently deployed for the custom-dialog frontend update and is now the current live portal.
- Portal access remains **Only myself**.
- Version 3 introduced **Awaiting Deposit / Deposit Paid**, **Cancel Competition**, **Restore Competition**, **Delete Permanently** after cancellation, active/cancelled filtering and the no-limit grade-display fix.
- Version 4 keeps those behaviors and replaces only the native confirmation presentation.
- Marking Deposit Paid does not automatically send/release the organiser Entry Manager link.
- Full lifecycle verification is complete as recorded above.

### System Operator Portal — deposit and lifecycle controls

- Extended the private portal beyond read-only viewing.
- Added operator deposit status: **Awaiting Deposit** and **Deposit Paid**.
- Existing records without operator metadata default to Awaiting Deposit.
- Added Active / Cancelled state using `operatorControl` inside the existing central competition JSON record.
- Added **Cancel Competition**, **Restore Competition**, and two-step **Delete Permanently**.
- Permanent delete moves the central competition JSON file to Google Drive Trash.
- Added default **Active competitions** filter and separate **Cancelled** filter.
- Cancelled cards hide the manager/public open buttons.
- Fixed grade-limit mapping to use the actual `entryLimit` field, removing `/ undefined` when no limit exists.
- No second database was introduced.

### Cancellation/deletion backend guard

- Added `google-apps-script/OperatorControlGuard.gs`.
- Updated `google-apps-script/WebApp.gs` to honour central operator lifecycle state.
- Manager setup, public setup/submission/result, manager writes and roster submission are blocked for cancelled/trashed competitions.
- Short-code resolution validates central availability before returning a token.
- Old token Script Property mappings may remain after deletion, but the central-file guard prevents stale links from reopening a deleted competition.

### System Operator Portal — Version 1 verification

- Created the separate private **Waimarino Shears System Operator Portal** Apps Script project.
- Version 1 executed as the Waimarino Shears Google account with **Only myself** access.
- Verified the portal in an InPrivate browser signed into only the authorised account.
- Loaded 3 existing competition records from the central Drive folder.
- Verified real competition/contact/entry-count data and manager/public buttons.
- Confirmed normal-browser Page Not Found behaviour was Google multi-account routing rather than a portal backend failure.

### System naming and custom domain

- Visible system branding set to **Speed Shear Entries** with **Entry Manager** as the organiser/admin area and **Speed Shear Competitor Entry** as the public side.
- Added and verified `entries.waimarinoshears.com` custom domain.
- Added private `m.html?c=<code>` and public `e.html?c=<code>` short-link resolver flow.
- Legacy full-token and old GitHub-hosted links remain supported/redirected.
- These original `m.html/e.html` short links are now retained as compatibility routes that forward to the newer `/manage/` and `/enter/` format.

### Public competitor entry V4

- Privacy version set to **28 August 2026**.
- Public form requires competitor name plus at least one contact method.
- Added per-entry references, competitor receipt email, organiser New Competitor Entry email and Waimarino Shears backup copy where applicable.
- Duplicate submissions do not resend notifications.

### Entry Manager and booking handoff

- Booking Pack-selected competition contact loads into the central competition record.
- Competition organiser remains responsible for competitor enquiries, changes/cancellations, payments and check-in.
- Waimarino Shears remains system provider/operator.
- Entry Manager backend previously progressed through Version 3 and Version 4 before the current Version 5 lifecycle guard deployment.

### End-to-end verification baseline

Using **WS-2026-0016 — Speedshear o ngā Taniwha**:

- Booking Pack handoff created the competition record.
- Private Entry Manager opened correctly.
- Public competitor entry opened correctly.
- Online entries saved and appeared in manager.
- Competitor receipt, organiser notification and Waimarino Shears backup email worked.
- Custom domain and legacy redirects passed.

### Known open technical item

- Private manager writes still use `fetch(..., mode:'no-cors')`, so the organiser frontend cannot read/validate backend response bodies. The Version 5 backend still blocks cancelled competition writes server-side.
