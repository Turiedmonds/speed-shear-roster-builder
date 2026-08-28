# PROJECT STATE — Speed Shear Entries / Entry Manager

**Last updated:** 28 August 2026

This file is the authoritative current-state handoff for future ChatGPT/Codex sessions.

## Working rule

Before changes:

1. Read `README.md`.
2. Read this file completely.
3. Read the latest `CHANGELOG.md` entries.
4. Inspect the exact repository/live source involved.

Before finishing meaningful changes:

1. Update this file when state, architecture, deployment, URLs, data flow, limitations or next steps change.
2. Update `CHANGELOG.md`.
3. Update `README.md` when architecture/setup/public behaviour changes.
4. Do not leave important implementation knowledge only in chat history.

## Project identity

Repository: `Turiedmonds/speed-shear-roster-builder`

Production domain: `https://entries.waimarinoshears.com`

Visible system name: **Speed Shear Entries**

Private organiser area: **Entry Manager**

Public page: **Speed Shear Competitor Entry**

The repository name is historical. Do not rename the production system back to “Roster Builder”.

## Current live production baseline

As at 28 August 2026:

- GitHub Pages custom domain active: `entries.waimarinoshears.com`.
- Speed Shear Entry Manager Apps Script live deployment: **Version 4**.
- Public competitor privacy version: **28 August 2026**.
- Separate System Operator Portal live deployment: **Version 1**.
- Portal executes as the Waimarino Shears Google account.
- Portal access is **Only myself**.
- Portal Version 1 has been verified against 3 existing central competition records.

Important: repository source now contains newer operator lifecycle-control changes that are **not live yet**. Do not describe those controls as production-active until both Apps Script projects are redeployed and tested.

## Relationship to Booking Pack

Separate booking repository:

`Turiedmonds/waimarino-shears-speed-shear-booking-pack`

The Booking Receiver POSTs an authorised setup payload to the Entry Manager backend containing:

- Booking Reference;
- competition name/date/venue;
- selected competition contact;
- grades/events;
- Programme of Events.

Required shared Script Property in the Booking Receiver and Entry Manager Apps Script projects:

`ENTRY_MANAGER_SHARED_SECRET`

Never put the secret value in GitHub, documentation, emails or user-facing output.

## Central competition records

Each competition is stored as one JSON record in the Google Drive folder:

`Waimarino Speed Shear Entry Manager`

Core fields include:

- `bookingReference`;
- manager token;
- public-entry token;
- competition identity;
- organiser/contact details;
- grades and grade settings;
- Programme of Events;
- competitors;
- submission history;
- optional `operatorControl` lifecycle/deposit metadata.

Token/file mappings remain in Entry Manager Apps Script Properties:

- `entryManagerToken_...`
- `entryPublicToken_...`
- `entryManagerReference_...`

Do not create a second competition database.

## Links

Short manager link:

`https://entries.waimarinoshears.com/m.html?c=<20-char-code>`

Short public-entry link:

`https://entries.waimarinoshears.com/e.html?c=<20-char-code>`

Legacy full-token links remain supported.

## Current Entry Manager behaviour

Private organiser features include:

- booking-loaded competition details;
- grades/events and Programme viewer;
- manual/bulk/public competitor entries;
- contact details;
- Confirmed / Not Confirmed;
- global/custom public closing;
- per-grade open/close and entry limits;
- grade reorder/collapse;
- JSON/PDF roster submission.

Compatibility note: organiser-facing **Confirmed** is stored in the existing `checkedIn` field.

## Public competitor entry

The public form collects name, hometown, grade/event, phone/email and privacy acknowledgement. At least one contact method is required.

Successful new public entries can:

- save centrally;
- receive an entry reference;
- send competitor receipt email;
- notify organiser;
- send Waimarino Shears a backup copy where applicable.

Competition administration remains the organiser’s responsibility.

## System Operator Portal

Separate Apps Script project: **Waimarino Shears System Operator Portal**.

Repository source:

- `operator-portal/google-apps-script/Code.gs`
- `operator-portal/google-apps-script/Index.html`
- `operator-portal/README.md`

### Verified live Version 1

Version 1 is live and private.

Verified:

- `Only myself` access works;
- portal reads the existing Drive records;
- 3 competition records loaded;
- competition/contact/entry-count/status data displayed;
- manager/public buttons displayed;
- `WS-2026-0016 — Speedshear o ngā Taniwha` displayed correctly.

A browser session signed into several Google accounts can route the Apps Script URL using the wrong Google account and show Page Not Found. An InPrivate session signed into only the Waimarino account worked. Prefer a dedicated browser profile/session; do not weaken access.

### Repository source — next operator lifecycle update

The repository now extends the portal beyond read-only viewing.

New source behaviour:

- deposit status: **Awaiting Deposit** / **Deposit Paid**;
- records without status default to Awaiting Deposit;
- marking Deposit Paid does **not** automatically send/release the organiser link;
- Active / Cancelled competition state;
- Cancel Competition;
- Restore Competition;
- permanent delete only after cancellation;
- Cancelled filter;
- active competitions are the default list;
- cancelled records do not show manager/public open buttons;
- fixed grade-limit mapping to use the actual `entryLimit` field, removing the old `/ undefined` display issue.

`operatorControl` is stored inside the same central competition JSON record. Typical shape:

- `status`: `active` or `cancelled`;
- `depositStatus`: `awaiting` or `paid`;
- `cancelledAt`;
- `updatedAt`.

No second database is introduced.

### Cancellation / deletion safety model

New repository file:

`google-apps-script/OperatorControlGuard.gs`

Updated backend router:

`google-apps-script/WebApp.gs`

Once these are deployed in the existing **Speed Shear Entry Manager** Apps Script project:

- cancelled manager links are rejected;
- cancelled public-entry links are rejected;
- manager/public writes are rejected for cancelled competitions;
- short-code resolution checks the central record before returning a token;
- trashed/deleted central records are rejected;
- if a Booking Reference points to a trashed file and a legitimate setup later reuses that reference, the stale reference mapping is cleared before recreation.

Permanent delete from the portal moves the central JSON file to Google Drive Trash. It intentionally requires Cancel first.

Old manager/public token Script Property mappings can remain after trashing. They are harmless once the guard is live because the guard checks the central file and refuses trashed records.

## Security boundary

Portal:

- separate Apps Script project;
- executes as Waimarino account;
- access **Only myself**;
- no shared secret or full tokens in browser-side code.

Entry Manager backend:

- remains public/reachable because organisers/competitors need their token links;
- setup requests remain protected by `ENTRY_MANAGER_SHARED_SECRET`;
- operator lifecycle protection is based on the central record’s `operatorControl` state, not a new browser secret.

## Backend source and deployment

Existing public Apps Script project: **Speed Shear Entry Manager**.

Current live version: **Version 4**.

Main source files:

- `google-apps-script/WebApp.gs`
- `google-apps-script/EntryManager.gs`
- `google-apps-script/EntryManagerV3.gs`
- `google-apps-script/CompetitorEntryV4.gs`
- `google-apps-script/OperatorControlGuard.gs` — repository source added, not live yet.

Deployment rule:

1. use complete repository files rather than partial edits where possible;
2. Save to Drive;
3. Deploy → Manage deployments;
4. edit current deployment;
5. choose New version;
6. retain existing web-app URL;
7. update this state/changelog after live verification.

## Required deployment order for the new lifecycle controls

Do **not** use Cancel/Delete on real bookings until protection is deployed.

1. Existing **Speed Shear Entry Manager** Apps Script project:
   - add complete `OperatorControlGuard.gs`;
   - replace `WebApp.gs` with current repository version;
   - deploy next backend version, retaining current URL.
2. Separate **Waimarino Shears System Operator Portal** Apps Script project:
   - replace `Code.gs`;
   - replace `Index.html`;
   - deploy next portal version with `Only myself` retained.
3. Test with a test competition:
   - mark deposit status;
   - Cancel;
   - verify manager/public links are rejected;
   - Restore and verify links work again;
   - Cancel again and Delete Permanently;
   - confirm deleted record disappears and its old links remain blocked.

The portal source now writes to Drive, so Google may request updated Drive authorisation on redeployment.

## Known technical limitation

`entry-manager.js` still uses `fetch(..., mode:'no-cors')` for private manager writes.

Consequences:

- browser cannot read/verify backend response bodies;
- a blocked write on a cancelled competition may not be surfaced cleanly by an already-open manager page;
- refresh/reopen will show the blocked competition state once the guard is live.

This remains a future hardening item.

## Verified full Entry Manager/public-entry competition

Latest full flow verification:

- Competition: **Speedshear o ngā Taniwha**
- Booking Reference: **WS-2026-0016**
- Date: **18 September 2026**
- Venue: **Turangawaewae marae**

Verified booking creation, manager/public links, public entry save, competitor receipt, organiser notification, Waimarino backup, custom domain and legacy redirect behaviour.

## Security note

The shared Booking Receiver ↔ Entry Manager secret was exposed during development/testing conversation history. Rotate it in both Apps Script projects before final production-hardening. Never record the replacement value here.

## Next planned work

Deploy and test the new lifecycle controls in the order above.

Do not mark the lifecycle controls as live until both deployments and the cancellation/restore/delete test have passed.

## Do not assume

- Do not rely on old chat memory over current repository files.
- Do not assume repository Apps Script source is live.
- Do not expose full tokens/shared secrets unnecessarily.
- Do not regenerate records merely to obtain links.
- Do not make the operator portal public to solve Google multi-account routing.
- Do not permanently delete an active competition; cancel first.
