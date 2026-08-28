# Waimarino Shears — Speed Shear Entries

Online entry-management system for Speed Shear competitions using the Waimarino Shears timing/entry platform.

## Live site

`https://entries.waimarinoshears.com`

Visible system name: **Speed Shear Entries**

Private organiser/admin area: **Entry Manager**

Public side: **Speed Shear Competitor Entry**

## Start here in a new ChatGPT/Codex session

Read in this order before making changes:

1. `README.md`
2. `PROJECT_STATE.md`
3. `CHANGELOG.md`

`PROJECT_STATE.md` is authoritative. Every meaningful functional, workflow, deployment, URL, data-model, email, privacy or policy change must update `PROJECT_STATE.md` and `CHANGELOG.md`. Update this README when architecture, setup or public behaviour changes.

## Purpose

A competition organiser manages entries for their own Speed Shear competition while Waimarino Shears provides and operates the entry/timing system.

The organiser handles competitor enquiries, entry changes/cancellations, payments and attendance/check-in. Waimarino Shears is the system provider/operator.

## Competition creation

Booking Pack repository:

`Turiedmonds/waimarino-shears-speed-shear-booking-pack`

After a booking submission, the Booking Receiver sends an authorised setup payload containing the Booking Reference, competition details, selected competition contact, grades/events and Programme of Events.

The Entry Manager backend creates/reuses one central Google Drive competition record and generates private organiser and public competitor links. The central Drive record remains the source of truth.

A record may exist before the required deposit is paid. Waimarino Shears decides when the organiser’s private Entry Manager link is released.

## Links

Custom domain: `https://entries.waimarinoshears.com`

Short links:

- private manager: `m.html?c=<short-code>`
- public competitor form: `e.html?c=<short-code>`

Legacy full-token links remain supported.

## Private Entry Manager

Current organiser features include booking-loaded competition details, grades/events, Programme viewer, manual/bulk/public competitor entry, competitor contact details, Confirmed/Not Confirmed, global/custom public closing, per-grade opening/entry limits, grade reorder/collapse and JSON/PDF roster submission.

The internal compatibility field remains `checkedIn` even where the UI says Confirmed.

## Public competitor entry

The public form collects competitor name, hometown, grade/event, phone/email and privacy acknowledgement. At least one contact method is required.

Privacy version currently in production: **28 August 2026**.

Successful public entries save centrally, receive an entry reference, can send a competitor receipt, notify the organiser, and send Waimarino Shears a backup copy where applicable.

## System Operator Portal

A separate private **System Operator Portal** gives Waimarino Shears one place to see and control all competitions without searching booking emails.

Portal source:

- `operator-portal/google-apps-script/Code.gs`
- `operator-portal/google-apps-script/Index.html`
- `operator-portal/README.md`

The portal uses the same central Drive records; it does not create a second competition database.

### Live Version 2

The portal is now deployed as **Version 2** and remains restricted to **Only myself**.

Version 2 includes:

- **Awaiting Deposit** / **Deposit Paid**;
- Active / Cancelled competition status;
- active/cancelled/lifecycle filtering;
- entry/grade/roster summaries;
- Open Entry Manager / Open Public Entry for active competitions;
- **Cancel Competition**;
- **Restore Competition**;
- **Delete Permanently** only after cancellation;
- fixed no-limit grade display.

Marking a deposit paid does **not** automatically email or release the organiser Entry Manager link.

Functional Cancel / blocked-link / Restore / Delete testing is still required on a test competition before these controls are considered fully verified.

### Portal security

- separate Google Apps Script web app/project;
- executes as the Waimarino Shears Google account;
- **Who has access: Only myself**;
- do not change it to unrestricted `Anyone` access.

When several Google accounts are signed into one browser, Google can route the private Apps Script URL through the wrong account and show Page Not Found. Use a browser profile/session signed into the authorised Waimarino account rather than weakening access.

## Entry Manager backend

Google Apps Script project: **Speed Shear Entry Manager**

Current live backend: **Version 5 — 28 August 2026**.

Main source files:

- `google-apps-script/WebApp.gs`
- `google-apps-script/EntryManager.gs`
- `google-apps-script/EntryManagerV3.gs`
- `google-apps-script/CompetitorEntryV4.gs`
- `google-apps-script/OperatorControlGuard.gs`

Version 5 blocks manager/public access and writes for cancelled competitions and rejects trashed/deleted competition records. The existing web-app URL was retained.

Required Script Property: `ENTRY_MANAGER_SHARED_SECRET`. Never commit or document its value.

## Cancellation/deletion model

Cancel keeps the central record for history but blocks organiser/public access server-side. Restore reactivates the same record and tokens. Permanent delete requires cancellation first and moves the central competition JSON file to Google Drive Trash.

Old token mappings may remain internally, but Version 5 checks the central file and refuses cancelled/trashed records.

## Important current limitation

`entry-manager.js` still sends private manager writes using `fetch(..., mode:'no-cors')`. The browser cannot read/verify the backend response body. Version 5 still blocks cancelled competition writes server-side, but an already-open manager page may not show a clean error until refreshed/reopened.

## Verified Entry Manager baseline

Latest full Entry Manager/public-entry verification used:

- **Speedshear o ngā Taniwha**
- Booking Reference **WS-2026-0016**
- 18 September 2026
- Turangawaewae marae

Private/public links, online entry save, organiser/competitor emails, backup email, custom domain and legacy redirects were verified before the lifecycle-control update.
