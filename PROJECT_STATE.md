# PROJECT STATE — Speed Shear Entries / Entry Manager

**Last updated:** 29 August 2026

This file is the authoritative current-state handoff for future ChatGPT/Codex sessions.

## Working rule

Before changes, read `README.md`, this file, and the latest `CHANGELOG.md`, then inspect the exact current source involved. Every meaningful change must update this file and `CHANGELOG.md`; update `README.md` when architecture, setup, deployment or public behaviour changes.

## Project identity

Repository: `Turiedmonds/speed-shear-roster-builder`

Production domain: `https://entries.waimarinoshears.com`

Visible system name: **Speed Shear Entries**

Private organiser area: **Entry Manager**

Public page: **Speed Shear Competitor Entry**

## Current live production baseline

As at 29 August 2026:

- GitHub Pages custom domain is active: `entries.waimarinoshears.com`.
- **Speed Shear Entry Manager Apps Script: Version 7 live.**
- Version 7 retains the existing web-app deployment URL and adds confirmed manager-write result checking.
- **Version 7 production manager-write smoke test passed:** a competitor was changed from Not Confirmed to Confirmed and remained Confirmed after a full page refresh.
- **System Operator Portal Apps Script: Version 6 live.**
- Portal Version 5 was deployed for tidy `/manage/` and `/enter/` link generation, but its `Code.gs` was missing the existing `operatorPortalSort_()` helper and therefore failed while loading the competition list.
- Portal Version 6 restored the missing sort helper while retaining the tidy links.
- The Portal Version 5 regression affected portal rendering only; it did **not** alter or delete any central competition records.
- Portal Version 6 post-deploy refresh passed: the active competition list and card loaded normally again with no ReferenceError.
- **Tidy manager/public URLs are verified live:** Portal/Open links load the correct competition while keeping `/manage/?c=...` and `/enter/?c=...` visible in the browser.
- Portal executes as the Waimarino Shears Google account and access remains **Only myself**.
- Public competitor privacy version remains **28 August 2026**.
- The full deposit/cancel/restore/delete lifecycle is verified end-to-end on a disposable test competition.
- The live Portal custom Cancel / Restore / Delete dialogs are verified from Version 4 and retained in Version 6.
- A dedicated normal Edge profile signed into only the authorised Waimarino Shears Google account successfully opens the private Portal without InPrivate.
- Entry Manager UI improvements are user smoke-tested successfully: Manual Entry helper wording, **Close Entries / Close All Entries**, smoother Checked / Paid confirmation state, and narrower desktop Close Entries button.
- Tidy GitHub Pages routes are published and current Apps Script deployments generate them directly.
- The shared Booking Receiver ↔ Entry Manager secret was rotated in both Apps Script projects on 29 August 2026. The replacement value is intentionally not stored in GitHub or chat.

## Preferred competition-specific links

Preferred user-facing links:

- private organiser Entry Manager: `https://entries.waimarinoshears.com/manage/?c=<20-char-code>`
- public competitor form: `https://entries.waimarinoshears.com/enter/?c=<20-char-code>`

Security/binding rules:

- manager and public links use different tokens and therefore different short codes;
- each short code is the first 20 hexadecimal characters of that competition's own token;
- the resolver accepts exactly 20 hex characters;
- manager codes search only `entryManagerToken_...` mappings;
- public codes search only `entryPublicToken_...` mappings;
- exactly one matching token is required;
- manager resolution applies `entryManagerAssertManagerTokenAvailable_`;
- public resolution applies `entryManagerAssertPublicTokenAvailable_`;
- cancelled or trashed/deleted competitions remain blocked;
- a public code therefore opens only the public form for the competition whose public token it resolves to.

Published routes:

- `enter/index.html` resolves the public short code and loads the existing long-token competitor form internally while leaving `/enter/?c=...` visible in the browser.
- `manage/index.html` resolves the manager short code and loads the existing long-token manager app internally while leaving `/manage/?c=...` visible in the browser.
- legacy `e.html?c=...` forwards to `/enter/?c=...`.
- legacy `m.html?c=...` forwards to `/manage/?c=...`.
- legacy full-token URLs remain supported.

Current competition tokens did not change.

### Version 7 Entry Manager backend

Live `google-apps-script/WebApp.gs` retains the Version 6 `/manage/` and `/enter/` link generation and the Version 5 lifecycle/availability guard.

Version 7 adds reliable manager-write acknowledgement without changing the stored competition format:

- frontend manager writes still use the Apps Script-compatible `fetch(..., mode:'no-cors')` POST;
- each write includes a unique `requestId`;
- the backend runs the write and stores its real success/error result briefly in Apps Script Cache;
- `GET action=manager-write-result` retrieves that result using the same manager token + request ID;
- the frontend polls for the result before treating the operation as confirmed;
- the cache key is a SHA-256 digest of manager token + request ID, so raw tokens are not used as cache-key text;
- cached results expire after 300 seconds.

This uses the same send-then-confirm pattern already proven by the public competitor-entry flow, while preserving the existing Apps Script transport compatibility.

Production verification passed on the live Entry Manager: a competitor confirmation change remained correctly saved after refresh, confirming the Version 7 acknowledgement path is functioning in production.

### Version 6 Portal link generation and repair

Live `operator-portal/google-apps-script/Code.gs` generates `/manage/` and `/enter/` directly for the Portal's **Open Entry Manager** and **Open Public Entry** buttons.

Version 5 accidentally omitted `operatorPortalSort_()` while changing those generated URL strings. The live portal then showed `ReferenceError: operatorPortalSort_ is not defined` and zero competitions because loading stopped before the list could be returned. Version 6 restores the exact existing sort helper. No competition record writes occur in that failed sort path, so the central records were unaffected. The subsequent Version 6 refresh confirmed normal competition listing was restored.

Live tidy-link verification also passed: the private manager button opens the correct competition at `/manage/?c=...`, and the public entry button opens the same competition's public form at `/enter/?c=...`, with the short URLs remaining visible.

## Central competition records

The source of truth remains one JSON record per competition in Google Drive folder:

`Waimarino Speed Shear Entry Manager`

Core data includes Booking Reference, manager/public tokens, competition identity, organiser contact, grades/settings, Programme, competitors, submissions and optional `operatorControl` metadata.

Token/file mappings remain in Entry Manager Apps Script Properties using `entryManagerToken_...`, `entryPublicToken_...` and `entryManagerReference_...`.

Do not create a second competition database.

## Relationship to Booking Pack

Booking Pack repository:

`Turiedmonds/waimarino-shears-speed-shear-booking-pack`

The Booking Receiver sends an authorised setup payload containing Booking Reference, competition name/date/venue, selected competition contact, grades/events and Programme of Events.

The shared Script Property is `ENTRY_MANAGER_SHARED_SECRET`. It is configured separately in both Apps Script projects and the values must match. Never put its value in GitHub, documentation, emails or user-facing output.

The shared secret was rotated on 29 August 2026 in both projects after the prior development value had been exposed in conversation history. No Apps Script deployment is required for Script Property changes.

A booking can create its central competition record before the organiser pays the required deposit. Waimarino Shears does **not** release the organiser Entry Manager link until the required booking/deposit stage has been met.

## Current organiser Entry Manager behaviour

Supports booking-loaded competition details, grades/events, Programme viewer, manual/bulk/public competitors, contact details, Confirmed/Not Confirmed, global/custom public closing, per-grade controls/limits, grade reorder/collapse and roster submission to Waimarino Shears.

The organiser action uses normal Speed Shear industry wording: **Close Entries** for an individual grade and **Close All Entries** for the overall action. A previously closed grade displays **Update Closed Entries** for a later updated roster.

Manual Entry helper text is:

**“Add competitor entries manually if they were not received through the online entry form.”**

Checked / Paid confirmation updates the clicked button and grade Confirmed count immediately, then completes the existing central save without rebuilding the full grade card.

The Close Entries confirmation explains that the grade will close to new public entries and the confirmed roster will be sent to Waimarino Shears. If competitors are not Confirmed, the warning lists them and offers **Close Entries Anyway**.

Compatibility note: organiser-facing **Confirmed** is stored in the existing `checkedIn` field.

## Manager cancellation access gate

The backend rejects cancelled/deleted manager and public access server-side. `entry-manager-bootstrap.js` also validates a manager token before loading organiser scripts, preventing stale cached organiser screens after cancellation/deletion.

Production testing confirmed cancelled and permanently deleted manager links show **Competition unavailable** rather than cached organiser controls.

## Public competitor entry

Collects competitor name, hometown, grade/event, phone/email and privacy acknowledgement. At least one contact method is required. Successful entries save centrally, can receive an entry reference, send a competitor receipt, notify the organiser and send Waimarino Shears a backup copy where applicable.

The tidy `/enter/?c=...` route itself is verified to resolve and display the correct competition. A full safe public form submission through that tidy route remains optional if further end-to-end entry testing is wanted.

## System Operator Portal — Version 6 live

Separate Apps Script project: **Waimarino Shears System Operator Portal**.

Repository source:

- `operator-portal/google-apps-script/Code.gs`
- `operator-portal/google-apps-script/Index.html`
- `operator-portal/README.md`

Version 6 includes:

- **Awaiting Deposit** / **Deposit Paid**;
- Active / Cancelled state;
- **Cancel Competition**;
- **Restore Competition**;
- **Delete Permanently** only after cancellation;
- active/cancelled/lifecycle filtering;
- entry/grade/roster summaries;
- custom Waimarino confirmation dialogs;
- tidy `/manage/` and `/enter/` button links;
- restored `operatorPortalSort_()` helper required by competition-list loading.

Marking **Deposit Paid** does not automatically send or release the organiser link. Waimarino Shears still controls when that private link is sent.

`operatorControl` is stored in the same competition JSON record, with fields such as `status`, `depositStatus`, `cancelledAt` and `updatedAt`.

Permanent delete moves the central JSON file to Google Drive Trash and intentionally requires Cancel first.

## Security boundary

Portal:

- separate Apps Script project;
- executes as Waimarino Shears account;
- access **Only myself**;
- no shared secret/full token stored in browser-side code.

Entry Manager backend remains publicly reachable because organisers/competitors need token links; setup requests remain protected by `ENTRY_MANAGER_SHARED_SECRET`.

Do not make the portal public to work around Google multi-account routing.

## Normal browser access

Normal Portal operation uses the dedicated Microsoft Edge profile named **Waimarino Shears**, with Google signed in only to the authorised Waimarino Shears account. InPrivate is not required.

## Verified competition baseline

Latest full Entry Manager/public-entry verification before the tidy-link change used:

- **Speedshear o ngā Taniwha**
- Booking Reference **WS-2026-0016**
- 18 September 2026
- Turangawaewae marae

Lifecycle-control verification used the separate **Entry Manager Test Competition**, which has now been permanently deleted as intended.

## Next planned work

1. Optionally smoke-test a full public competitor submission through the tidy `/enter/?c=...` route; route resolution itself is already verified.
2. When back at the Raspberry Pi, run `git status --short` before pulling the Timing System dialog changes.

The Version 7 manager-write verification, tidy manager/public URL verification and shared-secret rotation items are complete.