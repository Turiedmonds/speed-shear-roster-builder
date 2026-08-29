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

**Speed Shear Entry Manager Version 7 is live** and retains the Version 6 tidy-link generation. **System Operator Portal Version 6 is live** and its Open Entry Manager / Open Public Entry buttons generate the same tidy routes directly.

Portal Version 5 briefly failed to load competition cards because the tidy-link source edit accidentally removed the existing `operatorPortalSort_()` helper. Version 6 restored that helper without changing competition records, lifecycle behaviour or tokens.

## Uniform dialogs

Application-controlled dialogs across the Waimarino Shears Speed Shear web tools use a common visual pattern: white rounded panel, Waimarino red top accent, dark overlay, consistent heading/actions and clearly marked destructive confirmation.

Audit result in this repository:

- Entry Manager uses custom `<dialog>` confirmation/workflow screens rather than browser `confirm()` popups;
- Public Competitor Entry uses a custom privacy dialog and a Waimarino-styled Grade / Event picker rather than the native browser/iPad selection popup;
- the System Operator Portal uses uniform custom Waimarino dialogs for Cancel / Restore / Delete.

Google/browser permission, sign-in and authorisation prompts cannot be restyled by the application.

## Private Entry Manager

Current organiser features include booking-loaded competition details, grades/events, Programme viewer, manual/bulk/public competitor entry, competitor contact details, Confirmed/Not Confirmed, global/custom public closing, per-grade opening/entry limits, grade reorder/collapse and roster submission to Waimarino Shears.

The organiser-facing workflow uses normal Speed Shear language: the grade action is **Close Entries** rather than “Submit Confirmed Entries”. Closing a grade closes that grade to new public entries and sends the confirmed roster through the existing backend workflow. The overall action is **Close All Entries**. A previously closed grade can use **Update Closed Entries** when an updated confirmed roster needs to be sent.

Manual Entry helper text explains that it is for competitors not received through the online entry form. Checked / Paid confirmation changes update the button colour and Confirmed count immediately while the backend save continues, avoiding the previous whole-card redraw/flicker.

Confirmed competitors are visually grouped separately from entries still awaiting confirmation to make the entry desk easier to scan. This grouping is display-only and does not alter the underlying competitor sequence used later when the timing-system draw is created.

The Programme button opens the Programme of Events supplied from the Booking Pack. Its dynamic-loader initialization was repaired on 29 August 2026 after a live test found the button unresponsive; the repaired button was user-verified.

### Offline competitor-list fallback

The Entry Manager now has a deliberately limited offline fallback for competition-day resilience.

When a manager page has already loaded and internet is lost, competitor-list work can continue locally instead of forcing staff back to pen and paper:

- manual Add and Bulk Add;
- competitor name/town edits;
- competitor contact-detail edits;
- Confirmed/Not Confirmed changes;
- competitor removal.

These offline competitor operations are stored in a competition-specific local queue and clearly marked on the page. They automatically replay through the normal Version 7 confirmed-write path when connectivity returns.

The offline queue is intentionally **not** used for central competition-control actions such as Close Entries, Close All Entries, public-entry opening/closing, cutoff changes, grade settings or grade order. Those actions still require the central backend so the organiser cannot unknowingly create conflicting online/offline competition states.

The 30-second background public-entry refresh pauses while offline or while offline competitor changes are waiting to sync, protecting unsynced local entries from being replaced by a remote refresh.

`entry-manager-bootstrap.js` may load previously cached competition state when the browser explicitly reports offline and that competition has already been saved on the device. A completely cold offline reload still depends on the browser retaining the page/application files in its own cache.

### Local roster PDF

Each grade's **Download PDF** button now creates a real PDF directly on the device. It does not require the Apps Script backend or internet.

The PDF includes all competitors in that grade, their town, Confirmed/Not Confirmed state, Online/Manual source, any pending Offline marker, competition details and summary totals. It is intended as the human-readable emergency roster if connectivity fails. JSON remains the machine-readable handover format.

### Custom online-entry closing countdown

A custom closing date/time remains one universal online-entry cutoff for all grades. Individual grade **On / Off** controls still provide finer control before that universal cutoff.

When a custom cutoff is configured:

- the Entry Manager shows a live countdown, the actual closing date/time, and how many grades are currently accepting online entries;
- the Entry Manager countdown can be clicked to open/focus the existing custom closing-time setting;
- the public competitor form shows the same custom closing time and a live countdown near the competition header;
- both displays use the existing saved `autoCloseAt` timestamp, so there is no duplicate timer/source of truth;
- countdown ticking itself is local device-side arithmetic from the saved closing timestamp;
- the public page makes a silent setup re-check every 5 minutes, plus when it becomes visible again, so a changed closing time can be picked up without rebuilding the page or touching form inputs;
- more than 24 hours remaining is shown as days only; 24 hours or less is shown as hours and minutes;
- if no custom cutoff exists, the countdown stays hidden and the existing default final-shutdown rule remains in force.

This countdown is frontend-only and does **not** require a new Apps Script deployment.

The internal compatibility field remains `checkedIn` even where the UI says Confirmed. Internal submission data and backend transport remain unchanged even though the organiser-facing wording now says Close Entries.

The Entry Manager frontend uses `entry-manager-bootstrap.js` to validate token access against the live backend before loading the organiser application when online. This prevents a cancelled/deleted competition from displaying a stale cached organiser screen while connectivity is available.

### Confirmed manager writes — Version 7

The Entry Manager still sends Apps Script POST requests using the compatible `no-cors` method, but Version 7 no longer treats “request sent” as proof that the save succeeded.

Each manager write now carries a temporary request ID. The backend stores the real success/error result briefly in Apps Script Cache, and the frontend polls `manager-write-result` for that result. The organiser UI can therefore distinguish a confirmed save from a rejected/failed save without changing the existing data model or public-entry flow.

## Public competitor entry

The public form collects competitor name, hometown, grade/event, phone/email and privacy acknowledgement. At least one contact method is required.

Privacy version currently in production: **28 August 2026**.

Successful public entries save centrally, receive an entry reference, can send a competitor receipt, notify the organiser, and send Waimarino Shears a backup copy where applicable.

Unlimited grades are shown simply as open for entries rather than displaying unnecessary “No entry limit” wording. Grades with configured limits still show the useful count/places-left information.

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

Current live backend: **Version 7 — 29 August 2026**.

Main source files:

- `google-apps-script/WebApp.gs`
- `google-apps-script/EntryManager.gs`
- `google-apps-script/EntryManagerV3.gs`
- `google-apps-script/CompetitorEntryV4.gs`
- `google-apps-script/OperatorControlGuard.gs`

Version 7 retains the Version 6 tidy-link generation and Version 5 cancellation/deletion guard, and adds confirmed manager-write results using short-lived Apps Script Cache entries.

Required Script Property: `ENTRY_MANAGER_SHARED_SECRET`. Never commit or document its value.

The shared Booking Receiver ↔ Entry Manager secret was rotated on 29 August 2026 in both Apps Script projects. The replacement value is intentionally not recorded in GitHub or chat.

## Cancellation/deletion model

Cancel keeps the central record for history but blocks organiser/public access server-side. Restore reactivates the same record and tokens. Permanent delete requires cancellation first and moves the central competition JSON file to Google Drive Trash.

Old token mappings may remain internally, but Version 7 checks the central file and refuses cancelled/trashed records.

When online, the frontend access bootstrap verifies the full manager token before organiser UI is loaded. The offline cached-state fallback is only used when the browser explicitly reports offline and cached competition data exists locally.

## Verified Entry Manager baseline

Latest full Entry Manager/public-entry verification used:

- **Speedshear o ngā Taniwha**
- Booking Reference **WS-2026-0016**
- 18 September 2026
- Turangawaewae marae

Private/public links, online entry save, organiser/competitor emails, backup email, custom domain, lifecycle protections, Version 7 manager-write acknowledgement, tidy routes, 30-second safe public-entry polling, competitor grouping/public grade polish, Programme button repair and the custom closing countdown have been verified. The new offline manual-entry queue, reconnect sync and local PDF export still require the next airplane-mode smoke test after GitHub Pages publishes them.