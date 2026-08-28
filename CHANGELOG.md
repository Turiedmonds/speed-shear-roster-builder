# CHANGELOG — Speed Shear Entries / Entry Manager

This changelog records meaningful completed changes. Keep it current whenever functionality, workflow, deployment, URLs, email behaviour, privacy wording or architecture changes.

## 28 August 2026

### System Operator Portal — deposit and lifecycle controls (repository source)

- Extended the private System Operator Portal beyond read-only viewing.
- Added operator deposit status:
  - **Awaiting Deposit**;
  - **Deposit Paid**.
- Existing records without operator metadata default to Awaiting Deposit.
- Marking a deposit paid does **not** automatically send/release the organiser Entry Manager link.
- Added Active / Cancelled competition state using `operatorControl` in the existing central competition JSON record.
- Added **Cancel Competition**.
- Added **Restore Competition**.
- Added **Delete Permanently**, intentionally available only after a competition is cancelled.
- Permanent delete moves the central competition JSON file to Google Drive Trash.
- Added default **Active competitions** portal filter and separate **Cancelled** filter.
- Cancelled cards hide the manager/public open buttons.
- Added operator action confirmations.
- Fixed the grade limit source to use the actual `entryLimit` field, resolving the Version 1 `/ undefined` display issue at source.
- Portal source remains in the same repository and continues to use the existing central Drive records; no second database was created.

### Cancellation/deletion backend guard (repository source)

- Added `google-apps-script/OperatorControlGuard.gs` for the existing public Entry Manager Apps Script project.
- Updated `google-apps-script/WebApp.gs` to honour central operator lifecycle state.
- Manager setup requests are rejected when the competition is cancelled or its central file is trashed.
- Public competitor setup/submission/result requests are rejected when cancelled/trashed.
- Manager mutation/roster-submission requests are rejected when cancelled/trashed.
- Short-code resolution now validates the central competition before returning the full token.
- Added stale-reference preparation so a Booking Reference pointing to a trashed record can be legitimately recreated later.
- Old token Script Property mappings may remain after deletion, but the guard rejects access because the central file is trashed.
- These backend changes are in repository source only until the Entry Manager Apps Script project is redeployed.

### Deployment order recorded

- Lifecycle protection must be deployed before Cancel/Delete is used for real bookings.
- Required order:
  1. add `OperatorControlGuard.gs` to the existing **Speed Shear Entry Manager** Apps Script project;
  2. replace `WebApp.gs` with current repository source;
  3. deploy the next Entry Manager backend version while retaining its URL;
  4. replace portal `Code.gs` and `Index.html` with current repository source;
  5. deploy the next private portal version with **Only myself** retained;
  6. verify Cancel / blocked links / Restore / Delete using a test competition.
- The portal update writes to Drive and may require updated Google Drive authorisation.

### System Operator Portal — Version 1 live verification

- Created a separate Google Apps Script project for the private **System Operator Portal**.
- Deployed the portal as **Version 1**.
- Deployment executes as the Waimarino Shears Google account.
- Deployment access is restricted to **Only myself**.
- Authorised Google Drive access so the portal can read existing central competition JSON records.
- Verified the portal opens in an InPrivate browser signed into only the authorised Waimarino Shears account.
- Verified **3 existing competition records** loaded from the central Drive folder.
- Verified real competition name/date/venue/Booking Reference, organiser contact details, entry counts, lifecycle state and private/public action buttons display.
- Verified `WS-2026-0016 — Speedshear o ngā Taniwha` displayed correctly.
- Normal browser testing with several signed-in Google accounts produced Google Page Not Found / unable-to-open-file behaviour because Google routed the private Apps Script URL through the wrong account.
- Confirmed this is account-routing behaviour, not a portal backend failure.
- Portal access must remain private; do not use unrestricted `Anyone` access to work around account routing.

### Initial System Operator Portal source

- Added `operator-portal/google-apps-script/Code.gs`.
- Added `operator-portal/google-apps-script/Index.html`.
- Added `operator-portal/README.md`.
- Added competition search, lifecycle filtering and refresh.
- Added competition name/date/venue/Booking Reference/organiser contact display.
- Added total entry, Confirmed and Not Confirmed counts.
- Added per-grade counts, limits and submitted state.
- Added public-entry Open / Closed and roster status.
- Added private **Open Entry Manager** and **Open Public Entry** buttons using the existing 20-character short-link model.
- Portal source is separate from the public Entry Manager Apps Script project but uses the same central records.

### System naming and branding

- Renamed visible private system branding to **Speed Shear Entries**.
- Kept **Entry Manager** as the organiser/admin area label.
- Kept **Speed Shear Competitor Entry** as the public identity.
- Left the historical GitHub repository name unchanged.

### Custom domain

- Added Wix DNS CNAME `entries` → `turiedmonds.github.io`.
- Added repository `CNAME` for `entries.waimarinoshears.com`.
- GitHub Pages deployment completed successfully.
- Updated Apps Script public base URLs to the custom domain.
- Verified custom-domain private/public links.
- Verified old GitHub-hosted links redirect while preserving competition access.

### Short links

- Added 20-character short-code resolver flow.
- Added private `m.html?c=<code>` and public `e.html?c=<code>` links.
- Legacy full-token links remain supported.

### Public competitor entry V4

- Privacy version set to **28 August 2026**.
- Public form requires competitor name plus at least one contact method.
- Added per-entry references.
- Added automatic competitor receipt email.
- Added organiser New Competitor Entry email.
- Added Waimarino Shears backup copy where applicable.
- Duplicate submissions do not resend notifications.
- Email wording keeps competition administration with the organiser.

### Entry Manager UI and contact handoff

- Clarified Manual Entry area.
- Improved grade-card status/badge wording/layout.
- Reduced helper clutter and improved button styling.
- Booking Pack-selected competition contact is loaded into each competition record.
- Public receipts/notifications use the competition organiser contact.

### Apps Script deployment

- Entry Manager backend deployed as **Version 3** after public-entry notification/short-link work.
- Entry Manager backend deployed as **Version 4** after custom-domain base URL changes.
- Existing production web-app URL retained.

### End-to-end verification

Using **WS-2026-0016 — Speedshear o ngā Taniwha**:

- Booking Pack handoff created the competition record.
- Private Entry Manager opened correctly.
- Public competitor entry opened correctly.
- Online entries saved and appeared in manager.
- Competitor receipt email arrived.
- Organiser notification arrived.
- Waimarino Shears backup arrived.
- Custom domain and legacy redirects passed.

### Known open technical item

- Private manager writes still use `fetch(..., mode:'no-cors')`, so the manager frontend cannot read/validate backend response bodies. This remains a future robustness task.
