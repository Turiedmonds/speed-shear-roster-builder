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

The Entry Manager has a deliberately limited offline fallback for competition-day resilience without creating a second permanent database.

The **only permanent source of truth remains the central Google Drive competition record**. Offline mode uses the last saved local competition snapshot plus a temporary ordered queue of unsynced competitor-list changes.

Supported offline competitor work:

- manual Add and Bulk Add;
- competitor name/town edits;
- competitor contact-detail edits;
- Confirmed/Not Confirmed changes;
- competitor removal.

These competitor operations update the local Entry Manager state and are queued in order for the normal Version 7 confirmed-write path. Rows with pending changes are marked **Offline**.

The offline queue is intentionally **not** used for central competition-control actions such as Close Entries, Close All Entries, public-entry opening/closing, cutoff changes, grade settings or grade order. Those actions still require the central backend so the organiser cannot unknowingly create conflicting online/offline competition states.

The 30-second background public-entry refresh pauses while the real connectivity layer reports offline or while offline competitor changes are waiting/syncing, protecting unsynced local entries from being replaced by a remote refresh.

#### Real connectivity detection

The original fallback relied too heavily on `navigator.onLine`. iPad/Chrome testing showed that the browser can still report an available connection after usable internet has disappeared. In that condition, an apparently offline competitor action could enter the normal Version 7 save-confirmation path, wait, then roll back.

`entry-manager-offline.js` therefore performs a very small real-network probe before competitor-list writes. The service worker is explicitly prevented from satisfying that probe from cache. If the probe fails, the action is saved locally instead of being sent into the normal online confirmation path.

Service-worker v5 fixed the remaining reconnect-detection problem by turning the historical probe into a real no-store same-origin request to `/entry-manager.html`. Live iPad/Safari testing then showed the indicator change from Offline to **Online — syncing…**, count the queued changes down and finish at green **Online**.

Reconnect recovery does not rely on one browser event. The queue is retried from `online`, window focus, `pageshow`, return from background and a lightweight heartbeat. A separate backend reachability probe is used when there is no queued write available to prove backend recovery.

Normal online behaviour is unchanged: when the real connection is available, competitor writes still use Version 7 backend confirmation.

#### Offline page refresh/startup

`entry-manager-sw.js` is a versioned service worker that caches only the known Entry Manager application shell/assets required to reopen the manager after an outage. Current cache version is **`waimarino-entry-manager-offline-v6`**. v6 retains the verified v5 reconnect probe and adds the sanitized timing-roster exporter to the cached shell.

The tidy `/manage/?c=...` route also stores the already-resolved full manager token locally on the same device after a successful online resolution. If the resolver later cannot be reached because of a network/timeout failure, that previously opened competition can reopen with its cached token and saved local competition state.

`entry-manager-bootstrap.js` likewise permits the saved local competition to load after a network/timeout failure even when the browser incorrectly still claims to be online.

An explicit lifecycle rejection such as cancelled/not-found is still authoritative and does **not** use offline fallback. The cached tidy-route mapping is removed if the resolver explicitly rejects the link.

The tidy manager shell reveals its same-origin Entry Manager frame as soon as the cached manager DOM is rendered rather than waiting for the iframe's final `load` event. This prevents a slow/unavailable external resource from leaving a usable offline manager hidden behind the “Opening Entry Manager…” card.

A competition must therefore be opened successfully online on a device at least once before that device can reopen it offline.

Because the manager shell deliberately uses cache-first known assets, every future Entry Manager source change must bump the service-worker cache version/registration so an older cached JavaScript file cannot remain active.

#### Reconnect/sync rules

When connectivity returns:

1. central `action=entry-manager` setup refreshes are blocked while any offline queue item exists or is syncing, so the older server roster cannot overwrite unsynced local work;
2. queued competitor writes replay one at a time in their original order through Version 7;
3. an item stays queued until its backend write is confirmed;
4. the 30-second public-entry refresh remains blocked while the queue exists or is syncing;
5. after the queue is completely empty, the Entry Manager requests one controlled central refresh;
6. that refresh still waits while the operator is typing, editing, using a dialog or dragging, and it preserves scroll;
7. the connection indicator returns to **Online** only after real network/backend recovery and a successful queue drain.

This keeps the central Drive record as the single permanent source of truth without allowing a remote refresh to overwrite unsynced local work.

The complete live iPad/Safari acceptance path has now passed: offline Add, Confirmed/Not Confirmed, Remove, JSON/PDF download, a full offline browser refresh, reconnect/queue drain, green Online state, and a fresh online reload preserving the final roster centrally. The reconnect did take roughly 30–40 seconds before syncing began, which is recorded for later tuning.

### Local roster PDF

Each grade's **Download PDF** button creates a real PDF directly on the device and does not require the Apps Script backend or internet.

The current local PDF is intentionally simple:

- confirmed competitors only;
- competition name, grade/event and competition date at the top;
- aligned **No. / Name / Town** table;
- no venue, Booking Reference, generated timestamp, confirmation/source column or other operational metadata.

The PDF is built from the currently visible grade table and is read-only: generating it must not refresh, replace or reset the Entry Manager roster.

### Timing-system roster JSON

JSON is the machine-readable handover to `Turiedmonds/SheariQ-Speed-Shear-Timing-System`. The exact format is documented in `ROSTER-JSON-CONTRACT.md`.

The Entry Manager and Timing System now use two deliberately small compatible formats:

- a per-grade **Download JSON** file is a plain JSON array of confirmed competitors, with each row containing only `name` and `town`;
- **Download Full Roster** is `{ "type": "roster_pack", "rosters": { ... } }`, with each grade containing only confirmed `{name,town}` rows.

The Timing System keeps its existing single-grade import behaviour and now also accepts the multi-grade `roster_pack`. Multi-grade import replaces the matching configured grade rosters in one operation; it refuses an unknown grade rather than silently creating one without programme/round rules.

Roster downloads deliberately exclude manager access tokens, booking references, competition metadata, phone/email, source, IDs, status fields and timestamps. The backend Close Entries submission payload is a separate transport contract and still carries the authentication needed by the backend; simplifying a user-downloaded roster must not remove authentication from the actual server write.

`entry-manager-timing-export.js` performs these user-facing exports locally, so they remain available offline, and service-worker v6 includes that file in the cached manager shell.

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

The Entry Manager frontend uses `entry-manager-bootstrap.js` to validate token access against the live backend whenever that backend is reachable. Network/timeout failure may use the saved offline copy for a competition already opened on that device; explicit cancelled/not-found lifecycle responses remain blocking.

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

When the backend is reachable, the frontend access bootstrap verifies the full manager token before organiser UI is loaded. Offline fallback is only for a competition already saved on that device and only when live verification cannot be reached; explicit lifecycle rejection remains blocking.

## Verified Entry Manager baseline

Latest full Entry Manager/public-entry verification used:

- **Speedshear o ngā Taniwha**
- Booking Reference **WS-2026-0016**
- 18 September 2026
- Turangawaewae marae

Private/public links, online entry save, organiser/competitor emails, backup email, custom domain, lifecycle protections, Version 7 manager-write acknowledgement, tidy routes, 30-second safe public-entry polling, competitor grouping/public grade polish, Programme button repair, custom closing countdown and the complete offline → reconnect → sync → central reload handover have been verified. The sanitized timing JSON and new Timing System multi-grade import are committed and are the next live integration checks.
