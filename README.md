# Waimarino Shears — Speed Shear Entries

Online entry-management system for Speed Shear competitions using the Waimarino Shears timing/entry platform.

## Live site

`https://entries.waimarinoshears.com`

Visible system name: **Speed Shear Entries**

Private organiser/admin area: **Entry Manager**

Public side: **Speed Shear Competitor Entry**

## Start here in a new ChatGPT/Codex session

Before making changes, read in this order:

1. `README.md`
2. `PROJECT_STATE.md`
3. `CHANGELOG.md`

`PROJECT_STATE.md` is authoritative. Every meaningful functional, workflow, deployment, URL, data-model, email, privacy or policy change must update `PROJECT_STATE.md` and `CHANGELOG.md`. Update this README when architecture, setup or public behaviour changes.

## Purpose

A competition organiser manages entries for their own Speed Shear competition while Waimarino Shears provides and operates the entry/timing system.

The organiser handles competitor enquiries, entry changes/cancellations, payments and attendance/check-in. Waimarino Shears is the system provider/operator.

## Competition creation

The separate Booking Pack repository is:

`Turiedmonds/waimarino-shears-speed-shear-booking-pack`

After a booking submission, the Booking Receiver sends an authorised setup payload containing the Booking Reference, competition details, selected competition contact, grades/events and Programme of Events.

The Entry Manager backend creates/reuses one central Google Drive competition record and generates:

- private organiser/Entry Manager token;
- public competitor-entry token;
- short private/public links.

The central Drive records remain the source of truth.

## Link structure

Custom domain:

`https://entries.waimarinoshears.com`

Short links:

- private manager: `m.html?c=<short-code>`
- public competitor form: `e.html?c=<short-code>`

Legacy full-token links remain supported.

## Private Entry Manager

Current organiser features include:

- booking-loaded competition details;
- grades/events and Programme viewer;
- manual and bulk competitor entry;
- public/online competitors in the same tables;
- competitor contact details;
- Confirmed / Not Confirmed status;
- global/custom public closing controls;
- per-grade opening and entry limits;
- grade reorder/collapse;
- JSON/PDF roster submission workflow.

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

### Current operator workflow

A booking record may exist before the required deposit is paid.

The portal source now supports:

- **Awaiting Deposit** / **Deposit Paid** status;
- Active / Cancelled competition status;
- search and lifecycle/status filtering;
- entry/grade/roster summaries;
- Open Entry Manager / Open Public Entry buttons for active competitions;
- **Cancel Competition**;
- **Restore Competition**;
- two-step **Delete Permanently** for cancelled records.

Marking a deposit paid does **not** automatically send the organiser link. Waimarino Shears still decides when to release that private link.

### Cancellation and deletion protection

Repository backend source now includes:

- `google-apps-script/OperatorControlGuard.gs`
- updated `google-apps-script/WebApp.gs`

Once deployed, the backend guard rejects manager/public access when the central competition record is cancelled or moved to Google Drive Trash.

Permanent deletion intentionally requires cancellation first. Deletion moves the central JSON record to Drive Trash. Old token mappings may remain internally, but the guard refuses to open a cancelled/trashed record. A stale trashed Booking Reference mapping is cleared if that reference is legitimately created again later.

### Portal security

The portal is a separate Google Apps Script web app from the public Entry Manager backend.

Verified live portal deployment:

- **Version 1 — 28 August 2026**;
- executes as the Waimarino Shears Google account;
- **Who has access: Only myself**.

Do not change it to unrestricted `Anyone` access.

When several Google accounts are signed into one browser, Google can route the private Apps Script URL through the wrong account and show Page Not Found. Use a browser profile/session signed into the authorised Waimarino account rather than weakening access.

## Backend

Google Apps Script project: **Speed Shear Entry Manager**

Current verified live backend: **Version 4 — 28 August 2026**.

Main source files:

- `google-apps-script/WebApp.gs`
- `google-apps-script/EntryManager.gs`
- `google-apps-script/EntryManagerV3.gs`
- `google-apps-script/CompetitorEntryV4.gs`
- `google-apps-script/OperatorControlGuard.gs` — repository source added for the next deployment.

Required Script Property:

- `ENTRY_MANAGER_SHARED_SECRET`

Never commit or document its value.

## Deployment status

### Live now

- Entry Manager backend: **Version 4**.
- System Operator Portal: **Version 1**, private and verified.

### Repository source awaiting deployment

The next update adds deposit/cancel/restore/delete controls and the backend cancellation guard.

Deploy in this order:

1. Add `OperatorControlGuard.gs` to the existing Entry Manager Apps Script project.
2. Replace live `WebApp.gs` with the current repository version.
3. Deploy the Entry Manager backend as a new version, retaining its existing web-app URL.
4. Replace portal `Code.gs` and `Index.html` with the current repository versions.
5. Deploy the portal as a new version while retaining **Only myself**.
6. Test Cancel and Restore on a test competition before deleting test records.

The portal update now writes to Drive, so Google may request updated Drive permission.

## Important current limitation

`entry-manager.js` still sends private manager writes using `fetch(..., mode:'no-cors')`. The browser cannot read/verify the backend response body. This remains a future robustness task.

## Verified Entry Manager test

Latest full Entry Manager/public-entry verification used:

- **Speedshear o ngā Taniwha**
- Booking Reference **WS-2026-0016**
- 18 September 2026
- Turangawaewae marae

Private/public links, online entry save, organiser/competitor emails, backup email, custom domain and legacy redirects were verified.
