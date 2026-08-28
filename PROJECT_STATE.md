# PROJECT STATE — Speed Shear Entries / Entry Manager

**Last updated:** 28 August 2026

This file is the authoritative current-state handoff for future ChatGPT/Codex sessions.

## Working rule

Before changes, read `README.md`, this file, and the latest `CHANGELOG.md`, then inspect the exact live/repository source involved. Every meaningful change must update this file and `CHANGELOG.md`; update `README.md` when architecture, setup, deployment or public behaviour changes.

## Project identity

Repository: `Turiedmonds/speed-shear-roster-builder`

Production domain: `https://entries.waimarinoshears.com`

Visible system name: **Speed Shear Entries**

Private organiser area: **Entry Manager**

Public page: **Speed Shear Competitor Entry**

## Current live production baseline

As at 28 August 2026:

- GitHub Pages custom domain is active: `entries.waimarinoshears.com`.
- **Speed Shear Entry Manager Apps Script: Version 5 live.**
- **System Operator Portal Apps Script: Version 3 live.**
- Portal executes as the Waimarino Shears Google account.
- Portal access remains **Only myself**.
- Public competitor privacy version remains **28 August 2026**.
- Portal Version 3 contains both updated portal files and the deposit/cancel/restore/delete controls.
- Deposit Paid → Awaiting Deposit switching has been verified on the test competition.
- Cancel Competition has been verified to move the test competition out of the Active portal list.
- Public competitor access has been verified blocked after cancellation.
- Manager access has also now been verified blocked after cancellation: the GitHub Pages bootstrap guard prevents the cached organiser UI from loading and shows **Competition unavailable** instead.

## Relationship to Booking Pack

Booking Pack repository:

`Turiedmonds/waimarino-shears-speed-shear-booking-pack`

The Booking Receiver sends an authorised setup payload containing Booking Reference, competition name/date/venue, selected competition contact, grades/events and Programme of Events.

The shared Script Property is `ENTRY_MANAGER_SHARED_SECRET`. Never put its value in GitHub, documentation, emails or user-facing output.

A booking can create its central Entry Manager competition record before the organiser pays the required deposit. Waimarino Shears does **not** release the organiser Entry Manager link until the required booking/deposit stage has been met.

## Central competition records

The source of truth remains one JSON record per competition in Google Drive folder:

`Waimarino Speed Shear Entry Manager`

Core data includes Booking Reference, manager/public tokens, competition identity, organiser contact, grades/settings, Programme, competitors, submissions and optional `operatorControl` metadata.

Token/file mappings remain in Entry Manager Apps Script Properties using `entryManagerToken_...`, `entryPublicToken_...` and `entryManagerReference_...`.

Do not create a second competition database.

## Links

Private short link: `https://entries.waimarinoshears.com/m.html?c=<20-char-code>`

Public short link: `https://entries.waimarinoshears.com/e.html?c=<20-char-code>`

Legacy full-token links remain supported.

## Current organiser Entry Manager behaviour

Supports booking-loaded competition details, grades/events, Programme viewer, manual/bulk/public competitors, contact details, Confirmed/Not Confirmed, global/custom public closing, per-grade controls/limits, grade reorder/collapse and JSON/PDF roster submission.

Compatibility note: organiser-facing **Confirmed** is stored in the existing `checkedIn` field.

Private manager writes still use `fetch(..., mode:'no-cors')`, so an already-open manager page cannot reliably read backend error responses. Version 5 still rejects cancelled competition writes server-side.

## Manager cancellation access gate

Cancellation testing exposed an important browser-cache behaviour:

- Version 5 correctly rejected a cancelled manager token server-side;
- however `entry-manager.js` restored the previously saved localStorage copy before its server refresh completed;
- when the server refresh failed, the old code only displayed a warning and left that cached organiser screen visible/editable locally;
- public competitor access was correctly blocked and did not have this problem.

Repository fix now live and verified:

- `entry-manager-bootstrap.js` validates an `access` token against the live Entry Manager backend **before** loading the organiser application scripts;
- `entry-manager.html` stays hidden while validation is in progress;
- if the competition is cancelled/deleted/unavailable, the organiser application scripts are not loaded and the token-specific cached localStorage copy is removed;
- if validation succeeds, the normal Entry Manager scripts load in their existing order;
- no-token/manual mode retains the historical local-only behaviour.

Production re-test on the cancelled **Entry Manager Test Competition** confirmed the page now shows **Competition unavailable** and the cancelled organiser screen no longer loads.

## Public competitor entry

Collects competitor name, hometown, grade/event, phone/email and privacy acknowledgement. At least one contact method is required. Successful entries can save centrally, receive an entry reference, send a competitor receipt, notify the organiser and send Waimarino Shears a backup copy where applicable.

Competition administration remains the organiser’s responsibility.

## System Operator Portal — Version 3 live

Separate Apps Script project: **Waimarino Shears System Operator Portal**.

Repository source:

- `operator-portal/google-apps-script/Code.gs`
- `operator-portal/google-apps-script/Index.html`
- `operator-portal/README.md`

Version 3 uses the same central Drive records and includes:

- **Awaiting Deposit** / **Deposit Paid**;
- Active / Cancelled state;
- **Cancel Competition**;
- **Restore Competition**;
- **Delete Permanently** only after cancellation;
- active/cancelled/lifecycle filtering;
- fixed no-limit grade display;
- active competition manager/public buttons.

Marking **Deposit Paid** does not automatically send or release the organiser link. Waimarino Shears still controls when that private link is sent.

`operatorControl` is stored in the same competition JSON record, with fields such as `status`, `depositStatus`, `cancelledAt` and `updatedAt`.

Permanent delete moves the central JSON file to Google Drive Trash and intentionally requires Cancel first.

## Cancellation/deletion backend guard — Version 5 live

Live Entry Manager backend source includes:

- `google-apps-script/OperatorControlGuard.gs`
- updated `google-apps-script/WebApp.gs`

Version 5 is deployed with the existing Entry Manager web-app URL retained.

The backend rejects:

- manager access for cancelled competitions;
- public-entry access for cancelled competitions;
- manager/public writes for cancelled competitions;
- short-code resolution for cancelled competitions;
- access to trashed/deleted competition files.

If a Booking Reference maps to a trashed file and a legitimate setup later reuses that reference, the stale reference mapping is cleared before recreation.

Old token Script Property mappings may remain after trashing, but the guard refuses the missing/trashed central record.

## Security boundary

Portal:

- separate Apps Script project;
- executes as Waimarino Shears account;
- access **Only myself**;
- no shared secret/full token stored in browser-side code.

Entry Manager backend remains publicly reachable because organisers/competitors need token links; setup requests remain protected by `ENTRY_MANAGER_SHARED_SECRET`.

Do not make the portal public to work around Google multi-account routing.

## Multiple Google accounts

An `Only myself` Apps Script URL can show Google Page Not Found / unable-to-open-file when a browser session has several signed-in Google accounts and Google routes it through the wrong account. InPrivate with only the Waimarino account was verified. Prefer a browser profile/session signed into the authorised account.

## Verified competition baseline

Latest full Entry Manager/public-entry verification before lifecycle controls used:

- **Speedshear o ngā Taniwha**
- Booking Reference **WS-2026-0016**
- 18 September 2026
- Turangawaewae marae

Booking creation, manager/public links, public entry save, competitor receipt, organiser notification, Waimarino backup, custom domain and legacy redirects were verified.

## Security note

The shared Booking Receiver ↔ Entry Manager secret was exposed during development/testing conversation history. Rotate it in both Apps Script projects before final production-hardening. Never record the replacement value here.

## Next planned work

Continue using **Entry Manager Test Competition** only:

1. Restore Competition and confirm the same manager/public links work again;
2. Cancel again;
3. Delete Permanently;
4. confirm the competition disappears from the portal and both old links remain blocked.

Do not delete a real booking while this verification is being completed.
