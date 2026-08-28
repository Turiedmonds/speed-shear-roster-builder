# CHANGELOG — Speed Shear Entries / Entry Manager

This changelog records meaningful completed changes. Keep it current whenever functionality, workflow, deployment, URLs, email behaviour, privacy wording or architecture changes.

## 28 August 2026

### Operator lifecycle controls — live deployments

- Deployed **Speed Shear Entry Manager Version 5** while retaining the existing web-app URL.
- Version 5 includes `OperatorControlGuard.gs` plus the updated `WebApp.gs` lifecycle checks.
- Cancelled competitions are now rejected server-side for manager access, public entry access, manager/public writes and short-code resolution.
- Trashed/deleted central competition files are rejected.
- Stale Booking Reference mappings to trashed files are cleared before a legitimate recreation.
- Deployed **System Operator Portal Version 2** while retaining **Only myself** access.
- Version 2 includes **Awaiting Deposit / Deposit Paid**, **Cancel Competition**, **Restore Competition**, **Delete Permanently** after cancellation, active/cancelled filtering and the no-limit grade-display fix.
- Marking Deposit Paid does not automatically send/release the organiser Entry Manager link.
- Both deployments succeeded. Functional Cancel / blocked-link / Restore / Delete verification is still pending and must be performed on a test competition before real cancellations/deletions are relied on.

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

### Public competitor entry V4

- Privacy version set to **28 August 2026**.
- Public form requires competitor name plus at least one contact method.
- Added per-entry references, competitor receipt email, organiser New Competitor Entry email and Waimarino Shears backup copy where applicable.
- Duplicate submissions do not resend notifications.

### Entry Manager and booking handoff

- Booking Pack-selected competition contact loads into the central competition record.
- Competition organiser remains responsible for competitor enquiries, changes, cancellations, payments and check-in.
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

- Private manager writes still use `fetch(..., mode:'no-cors')`, so the organiser frontend cannot read/validate backend response bodies. The Version 5 backend still blocks cancelled competitions server-side, but an already-open manager page may not display a clean error until refreshed/reopened.
