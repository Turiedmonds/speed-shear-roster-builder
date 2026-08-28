# CHANGELOG — Speed Shear Entries / Entry Manager

This changelog records meaningful completed changes. Keep it current whenever functionality, workflow, deployment, URLs, email behaviour, privacy wording or architecture changes.

## 28 August 2026

### System naming and branding

- Renamed the visible private system branding to **Speed Shear Entries**.
- Kept **Entry Manager** as the private organiser/admin area label.
- Kept **Speed Shear Competitor Entry** as the public-entry identity.
- Intentionally left the GitHub repository name unchanged because it is historical/internal.

### Custom domain

- Added Wix DNS CNAME `entries` → `turiedmonds.github.io`.
- Added repository `CNAME` for `entries.waimarinoshears.com`.
- GitHub Pages deployment completed successfully.
- Updated Apps Script public base URLs to `https://entries.waimarinoshears.com/`.
- Verified the custom domain opens both private and public pages.
- Verified old `turiedmonds.github.io/speed-shear-roster-builder/...` links redirect to the custom domain while preserving competition access.

### Short links

- Added 20-character short-code resolver flow.
- Added private short-link format `m.html?c=<code>`.
- Added public short-link format `e.html?c=<code>`.
- Booking-created competition setup now returns short private/public links using the custom domain.
- Legacy full-token manager/public URLs remain supported.

### Public competitor entry V4

- Privacy version set to **28 August 2026**.
- Public form requires competitor name plus at least one contact method (phone or email).
- Added per-entry references in the form `<bookingReference>-E###`.
- Added automatic competitor email receipt when an email address is supplied.
- Added organiser New Competitor Entry email.
- Waimarino Shears receives a backup copy via BCC when organiser and backup addresses differ.
- If no organiser email exists, the Waimarino backup address becomes the notification destination.
- Duplicate submissions do not resend confirmation/organiser emails.
- Email wording explicitly keeps competition administration with the organiser and Waimarino Shears as system provider/operator.

### Entry Manager UI tidy-up

- Clarified **Manual Entry** area so manual competitor entry is visibly its own section.
- Improved grade-card status/badge wording and layout.
- Reduced top-page helper clutter.
- Updated visible button styling/organisation for clearer distinction from input fields.
- Retained manual entry and bulk-name entry in the same workflow as the grade competitor table.

### Competition-contact handoff

- Booking Pack-selected competition contact is loaded into each Entry Manager competition record.
- Public form/receipts use the competition organiser contact rather than directing competitors to Waimarino Shears by default.

### Apps Script deployment

- Entry Manager backend deployed as **Version 3** after V4 public-entry notification/short-link changes.
- Entry Manager backend deployed as **Version 4** after custom-domain base URL changes.
- Existing production Apps Script web-app URL retained.

### End-to-end verification

Using **WS-2026-0016 — Speedshear o ngā Taniwha**:

- Booking Pack handoff created the competition record.
- Private Entry Manager opened correctly.
- Public competitor entry opened correctly.
- Online competitors saved and appeared in the manager.
- Competitor receipt email arrived successfully.
- Competition organiser received New Competitor Entry email.
- Waimarino Shears received backup copy.
- Public form displayed successful Entry received confirmation.
- Custom domain passed both public/private link tests.
- Legacy GitHub-hosted links redirected correctly to the custom domain.

### Documentation

- Added root `README.md` with current production architecture/deployment information.
- Added `PROJECT_STATE.md` as the authoritative future-session handoff.
- Added this changelog.
- Replaced stale pre-deployment `IMPLEMENTATION-NOTES.md` status with a pointer to current documentation.
- Added standing rule that meaningful future changes must update project state and changelog before completion.

### Known open technical item

- Private manager writes still use `fetch(..., mode:'no-cors')`, so the manager frontend cannot read/validate backend response bodies. This remains a future robustness task.

### Next planned project

- Build the **System Operator Portal** for Waimarino Shears using the existing Entry Manager competition records/tokens rather than creating a second source of truth.
