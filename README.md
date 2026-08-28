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

Preferred tidy links:

- private manager: `https://entries.waimarinoshears.com/manage/?c=<20-char-code>`
- public competitor form: `https://entries.waimarinoshears.com/enter/?c=<20-char-code>`

Each 20-character code is derived from that competition's own manager or public token. The backend resolver requires the code to resolve to exactly one competition and then applies the existing active/cancelled/deleted availability checks before returning the internal token. A public code therefore opens only the public entry form for its own competition; a manager code opens only its own Entry Manager.

The tidy `/enter/` and `/manage/` pages keep the short address visible while the full bearer token remains internal to the page. The old `e.html?c=...` and `m.html?c=...` links remain supported and forward to the tidy routes. Legacy full-token links also remain supported.

The Entry Manager **Copy Link** control normalises existing old short/full public URLs to the tidy `/enter/?c=...` form before copying, so current competitions do not need new tokens.

**Speed Shear Entry Manager Version 6 is live** and generates `/manage/` and `/enter/` directly for booking handoffs and returned links. **System Operator Portal Version 6 is live** and its Open Entry Manager / Open Public Entry buttons generate the same tidy routes directly.

Portal Version 5 briefly failed to load competition cards because the tidy-link source edit accidentally removed the existing `operatorPortalSort_()` helper. Version 6 restored that helper without changing competition records, lifecycle behaviour or tokens.

## Uniform dialogs

Application-controlled dialogs across the Waimarino Shears Speed Shear web tools use a common visual pattern: white rounded panel, Waimarino red top accent, dark overlay, consistent heading/actions and clearly marked destructive confirmation.

Audit result in this repository:

- Entry Manager already uses custom `<dialog>` confirmation/workflow screens rather than browser `confirm()` popups;
- Public Competitor Entry already uses a custom privacy dialog and no browser-native confirmation path was found;
- the System Operator Portal was the remaining area using browser-native confirmations for Cancel / Restore / Delete;
- **System Operator Portal Version 6 is live** and retains the Version 4 uniform custom Waimarino dialogs while adding tidy `/manage/` and `/enter/` link generation and restoring the required competition-list sort helper.

Google/browser permission, sign-in and authorisation prompts cannot be restyled by the application.

## Private Entry Manager

Current organiser features include booking-loaded competition details, grades/events, Programme viewer, manual/bulk/public competitor entry, competitor contact details, Confirmed/Not Confirmed, global/custom public closing, per-grade opening/entry limits, grade reorder/collapse and roster submission to Waimarino Shears.

The organiser-facing workflow uses normal Speed Shear language: the grade action is **Close Entries** rather than “Submit Confirmed Entries”. Closing a grade closes that grade to new public entries and sends the confirmed roster through the existing backend workflow. The overall action is **Close All Entries**. A previously closed grade can use **Update Closed Entries** when an updated confirmed roster needs to be sent.

Manual Entry helper text explains that it is for competitors not received through the online entry form. Checked / Paid confirmation changes update the button colour and Confirmed count immediately while the backend save continues, avoiding the previous whole-card redraw/flicker. This organiser-UI update has been user smoke-tested successfully in production.

The internal compatibility field remains `checkedIn` even where the UI says Confirmed. Internal submission data, JSON/PDF generation and backend transport remain unchanged even though the organiser-facing wording now says Close Entries.

The Entry Manager frontend uses `entry-manager-bootstrap.js` to validate token access against the live backend before loading the organiser application. This prevents a cancelled/deleted competition from displaying a stale cached organiser screen from localStorage after the backend has rejected access.

If token validation fails, the organiser application scripts are not loaded and the page shows the competition as unavailable. No-token/manual mode retains its historical local-only behaviour.

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

### Current live Version 6

The live portal is **Version 6** and remains restricted to **Only myself**.

Version 6 includes all previously verified Version 4 behaviour, tidy competition links, and the restored list-sorting helper:

- **Awaiting Deposit** / **Deposit Paid**;
- Active / Cancelled competition status;
- active/cancelled/lifecycle filtering;
- entry/grade/roster summaries;
- Open Entry Manager / Open Public Entry for active competitions;
- **Cancel Competition**;
- **Restore Competition**;
- **Delete Permanently** only after cancellation;
- fixed no-limit grade display;
- uniform custom Waimarino confirmation dialogs for Cancel / Restore / Delete;
- direct `/manage/?c=...` and `/enter/?c=...` URLs from portal buttons;
- restored `operatorPortalSort_()` required by `getOperatorCompetitions()`.

Version 5 was the first tidy-link deployment but failed on portal refresh because `operatorPortalSort_()` had been removed from `Code.gs`. Version 6 restores that function. The failure was read/list processing only and did not modify central competition records.

The deposit/cancel/restore/delete lifecycle, including stale-link blocking after permanent deletion, has been fully verified using a disposable test competition.

Marking a deposit paid does **not** automatically email or release the organiser Entry Manager link.

### Portal security and normal browser access

- separate Google Apps Script web app/project;
- executes as the Waimarino Shears Google account;
- **Who has access: Only myself**;
- do not change it to unrestricted `Anyone` access.

InPrivate was used for testing only because a browser session with several Google accounts could route the private Apps Script URL through the wrong account. InPrivate is not required for normal operation.

Recommended normal setup: use the dedicated Edge/Chrome profile signed only into the authorised Waimarino Shears Google account and bookmark the portal there.

## Entry Manager backend

Google Apps Script project: **Speed Shear Entry Manager**

Current live backend: **Version 6 — 29 August 2026**.

Main source files:

- `google-apps-script/WebApp.gs`
- `google-apps-script/EntryManager.gs`
- `google-apps-script/EntryManagerV3.gs`
- `google-apps-script/CompetitorEntryV4.gs`
- `google-apps-script/OperatorControlGuard.gs`

Version 6 retains the Version 5 cancellation/deletion guard and existing web-app URL, while changing generated short links to `/manage/` and `/enter/` directly.

Required Script Property: `ENTRY_MANAGER_SHARED_SECRET`. Never commit or document its value.

## Cancellation/deletion model

Cancel keeps the central record for history but blocks organiser/public access server-side. Restore reactivates the same record and tokens. Permanent delete requires cancellation first and moves the central competition JSON file to Google Drive Trash.

Old token mappings may remain internally, but Version 6 checks the central file and refuses cancelled/trashed records.

The frontend access bootstrap is an additional protection for already-resolved manager URLs: it verifies the full manager token before any cached organiser UI is loaded.

## Important current limitation

`entry-manager.js` still sends private manager writes using `fetch(..., mode:'no-cors')`. The browser cannot read/verify the backend response body. Version 6 still blocks cancelled competition writes server-side.

## Verified Entry Manager baseline

Latest full Entry Manager/public-entry verification used:

- **Speedshear o ngā Taniwha**
- Booking Reference **WS-2026-0016**
- 18 September 2026
- Turangawaewae marae

Private/public links, online entry save, organiser/competitor emails, backup email, custom domain and lifecycle protections have been verified. The new tidy `/enter/` route remains to be smoke-tested with a safe public test entry, and Portal Version 6 should first be refreshed to confirm the repaired competition list loads normally.
