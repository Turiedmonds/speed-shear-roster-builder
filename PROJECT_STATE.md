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
- **System Operator Portal Apps Script: Version 4 live.**
- Version 4 deployment was confirmed successful on 28 August 2026 at 7:23 PM.
- Portal executes as the Waimarino Shears Google account.
- Portal access remains **Only myself**.
- Public competitor privacy version remains **28 August 2026**.
- The full deposit/cancel/restore/delete lifecycle has been verified end-to-end on the now-deleted test competition.
- Version 4 replaces the Portal's browser-native Cancel / Restore / Delete confirmations with uniform custom Waimarino dialogs. The lifecycle server calls are unchanged.
- A safe Version 4 smoke test on the real **Speedshear o ngā Taniwha** competition confirmed the branded **Cancel this competition?** dialog renders correctly in a narrow/mobile layout with **Keep Competition** and red **Cancel Competition** actions. The competition was not changed.
- A dedicated normal Microsoft Edge profile named **Waimarino Shears**, signed into Google only with the authorised Waimarino Shears account, has been tested successfully. The private Operator Portal opens normally in that profile without InPrivate.

## Uniform custom-dialog standard

The Speed Shear web tools are standardising application-controlled dialogs around one visual pattern:

- white rounded panel;
- Waimarino red top accent;
- dark overlay;
- **Waimarino Shears** eyebrow/branding;
- consistent heading, body copy and action spacing;
- destructive confirmation clearly shown in red;
- avoid browser-native `alert()` / `confirm()` where the application controls the UI.

Current audit/result in this repository:

- organiser **Entry Manager** already used custom `<dialog>` workflows rather than browser-native confirmation boxes;
- public **Speed Shear Competitor Entry** already used a custom privacy dialog and no native browser confirmations were found;
- the **System Operator Portal** was the remaining native-popup area, using browser `confirm()` for Cancel, Restore and Delete;
- `operator-portal/google-apps-script/Index.html` now uses the uniform custom Waimarino dialog for those three actions;
- that source is now deployed as **System Operator Portal Version 4**;
- the live Cancel dialog has been visually smoke-tested successfully without changing the real competition;
- underlying portal lifecycle calls and server-side behavior are unchanged.

Google/browser account, security and authorisation prompts are platform UI and cannot be restyled.

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

Version 5 correctly rejects cancelled/deleted manager access server-side. The GitHub Pages frontend also uses `entry-manager-bootstrap.js` to validate a token before loading organiser scripts, preventing stale cached organiser screens from appearing after cancellation/deletion.

Production testing confirmed both cancelled and permanently deleted manager links show **Competition unavailable** rather than loading cached organiser controls.

## Public competitor entry

Collects competitor name, hometown, grade/event, phone/email and privacy acknowledgement. At least one contact method is required. Successful entries can save centrally, receive an entry reference, send a competitor receipt, notify the organiser and send Waimarino Shears a backup copy where applicable.

Competition administration remains the organiser’s responsibility.

## System Operator Portal

Separate Apps Script project: **Waimarino Shears System Operator Portal**.

Repository source:

- `operator-portal/google-apps-script/Code.gs`
- `operator-portal/google-apps-script/Index.html`
- `operator-portal/README.md`

### Live Version 4

Version 4 is live and includes:

- **Awaiting Deposit** / **Deposit Paid**;
- Active / Cancelled state;
- **Cancel Competition**;
- **Restore Competition**;
- **Delete Permanently** only after cancellation;
- active/cancelled/lifecycle filtering;
- entry/grade/roster summaries;
- active competition manager/public buttons;
- uniform custom Waimarino confirmation dialogs for Cancel / Restore / Delete instead of browser-native Apps Script popups.

The lifecycle implementation is fully verified. Do not repeat destructive lifecycle testing on real bookings.

The popup-only Version 4 change does not alter `Code.gs` or any lifecycle server call. The live Cancel confirmation has been smoke-tested safely and the real competition remained active.

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

## Normal browser access / multiple Google accounts

InPrivate was used only to avoid Google choosing the wrong signed-in account during testing. It is **not a security requirement** for the portal.

The normal-browser solution has now been implemented and verified:

- a dedicated Microsoft Edge profile named **Waimarino Shears** was created;
- Edge/Microsoft sync was intentionally left unsigned-in;
- Google was signed in only with the authorised Waimarino Shears Google account in that profile;
- the private Operator Portal opened successfully in the normal profile without InPrivate;
- portal access remains **Only myself**.

Use this dedicated profile for normal portal operation and bookmark the portal there. Do not weaken Apps Script access to solve account-routing problems.

## Verified competition baseline

Latest full Entry Manager/public-entry verification before lifecycle controls used:

- **Speedshear o ngā Taniwha**
- Booking Reference **WS-2026-0016**
- 18 September 2026
- Turangawaewae marae

Booking creation, manager/public links, public entry save, competitor receipt, organiser notification, Waimarino backup, custom domain and legacy redirects were verified.

Lifecycle-control verification used the separate **Entry Manager Test Competition**, which has now been permanently deleted as intended.

## Security note

The shared Booking Receiver ↔ Entry Manager secret was exposed during development/testing conversation history. Rotate it in both Apps Script projects before final production-hardening. Never record the replacement value here.

## Next planned work

1. When back at the Raspberry Pi, run `git status --short` before pulling the Timing System dialog changes.
2. Rotate the shared Booking Receiver ↔ Entry Manager secret as final production-security cleanup.

Known technical item: private manager writes still use `fetch(..., mode:'no-cors')`, so the organiser frontend cannot read/validate backend response bodies. The Version 5 lifecycle guard itself is verified and does not depend on resolving that limitation.
