# PROJECT STATE — Speed Shear Entries / Entry Manager

**Last updated:** 28 August 2026

This file is the authoritative current-state handoff for future ChatGPT/Codex sessions.

## Working rule for future changes

Before making changes:

1. Read `README.md`.
2. Read this file completely.
3. Read the latest entries in `CHANGELOG.md`.
4. Inspect the exact repository/live source involved before assuming behaviour.

Before finishing any meaningful change:

1. Update this file if current state, architecture, URLs, deployment, data flow, known limitations or next steps changed.
2. Add a dated entry to `CHANGELOG.md`.
3. Update `README.md` when public behaviour, setup or deployment instructions changed.
4. Do not leave important implementation knowledge only in chat history.

## Project identity

Repository:

`Turiedmonds/speed-shear-roster-builder`

Production domain:

`https://entries.waimarinoshears.com`

Visible system name:

**Speed Shear Entries**

Private organiser area:

**Entry Manager**

Public page:

**Speed Shear Competitor Entry**

The repository name is historical. Do not rename the production system back to “Roster Builder” merely because the GitHub repository still uses that name.

## Production baseline

Current verified production state as at 28 August 2026:

- GitHub Pages custom domain is active: `entries.waimarinoshears.com`.
- Wix DNS CNAME `entries` points to `turiedmonds.github.io`.
- Repository `CNAME` is configured for `entries.waimarinoshears.com`.
- Speed Shear Entry Manager Apps Script active deployment: **Version 4**.
- `google-apps-script/WebApp.gs` uses the custom domain as `ENTRY_MANAGER_PUBLIC_BASE_URL`.
- `google-apps-script/EntryManager.gs` uses `https://entries.waimarinoshears.com/` as `publicBaseUrl`.
- Public competitor privacy version: **28 August 2026**.
- System Operator Portal repository source is implemented under `operator-portal/` but is **not yet deployed live**.

## Relationship to Booking Pack

The separate booking repository is:

`Turiedmonds/waimarino-shears-speed-shear-booking-pack`

The Booking Receiver creates Entry Manager competitions by POSTing an authorised setup payload to this Apps Script backend.

Required shared Script Property in both Apps Script projects:

`ENTRY_MANAGER_SHARED_SECRET`

Never put the secret value in GitHub, documentation, emails or user-facing output.

The setup payload includes:

- Booking Reference;
- competition name/date/venue;
- selected competition contact;
- grades/events;
- Programme of Events.

One competition record is then created/reused in Google Drive.

## Competition records and tokens

Each competition record has:

- `bookingReference`;
- private manager token;
- public competitor-entry token;
- competition identity;
- organiser/contact details;
- grades and grade settings;
- Programme of Events;
- competitors;
- submission history.

Token → Drive-file mappings are stored in Apps Script Properties using prefixes such as:

- `entryManagerToken_`
- `entryPublicToken_`
- `entryManagerReference_`

Do not duplicate competition data into a second portal database unless there is a compelling reason.

## Link model

### Short links

The backend currently creates 20-character short codes from the front of the random token.

Private organiser link:

`https://entries.waimarinoshears.com/m.html?c=<20-char-code>`

Public competitor link:

`https://entries.waimarinoshears.com/e.html?c=<20-char-code>`

`m.html` / `e.html` call the Apps Script resolver, recover the unique full token and redirect into the correct full-token page.

### Legacy links

Full-token links remain supported:

- private: `?access=<token>`
- public: `competitor-entry.html?entry=<token>`

Old `turiedmonds.github.io/speed-shear-roster-builder/...` links sent before the custom-domain change redirect to `entries.waimarinoshears.com` and preserve the competition token. This was manually verified.

## Private Entry Manager behaviour

Current manager features include:

- booking-loaded competition name/date/venue/reference;
- grades/events;
- Programme of Events viewer;
- manual individual competitor entry;
- bulk list entry;
- public/online competitors in the same tables;
- competitor phone/email via Details view;
- Confirmed / Not Confirmed status;
- open/close public entries globally;
- custom public closing date/time;
- default final public shutdown 12 hours after competition day ends;
- per-grade public open/close;
- optional per-grade entry limit;
- grade reorder via buttons/drag;
- collapse/expand grade cards;
- JSON/PDF roster output/submission.

UI naming note:

The backend still stores the old compatibility field `checkedIn`, but the current organiser-facing control says **Confirmed** / **Not Confirmed**.

## Public competitor entry behaviour

Current public form collects:

- competitor name;
- hometown;
- grade/event;
- mobile number;
- email address;
- privacy acknowledgement.

At least one of phone/email is required.

The form shows live grade availability/count/limits and prevents selection when the grade is closed/submitted/full.

Successful new public entry:

1. backend validates overall/grade opening and capacity while holding a script lock;
2. entry receives an entry reference such as `WS-2026-0016-E003`;
3. competitor record is saved centrally;
4. if an email address was supplied, competitor receipt email is sent;
5. organiser new-entry notification is sent to the organiser email when present;
6. Waimarino Shears receives a backup copy via BCC when organiser and backup addresses differ;
7. if organiser email is absent, backup address becomes primary notification destination.

Duplicate public submissions do not send duplicate receipt/organiser emails.

## Competition administration responsibility

This distinction is deliberate and should remain consistent in wording:

- Competition organiser manages entry changes, cancellations, payments, check-in and competitor enquiries.
- Waimarino Shears provides/operates the entry/timing system and receives backup records.

Do not turn Waimarino Shears into the default contact for competitor changes unless the competition itself is being organised by Waimarino Shears.

## Confirmed email flow

Latest tested public-entry flow:

- competitor receipt sent successfully to competitor email;
- organiser “New Competitor Entry” email sent successfully;
- Waimarino Shears received backup copy;
- submitted entry appeared in the private Entry Manager;
- public form displayed green Entry received confirmation.

The organiser email includes an **Open Entry Manager** button and makes organiser responsibility explicit.

## Branding/name decision

Current visible private header:

- eyebrow: **ENTRY MANAGER**
- main title: **Speed Shear Entries**

This name was chosen to keep this system specifically identified as Speed Shear, while leaving open the possibility of a separate future full-format Waimarino Shears competition entry system.

The future full-format system may reuse concepts/code from this project but should not be assumed to be the same product. Payment-at-entry is expected to be a major difference: a future full-format public entry is likely to require successful online payment before the entry is completed, with separate on-the-day attendance/check-in handling.

Do not design that future system as part of current work unless explicitly requested.

## Backend source and deployment

Apps Script source files:

- `google-apps-script/WebApp.gs`
- `google-apps-script/EntryManager.gs`
- `google-apps-script/EntryManagerV3.gs`
- `google-apps-script/CompetitorEntryV4.gs`

Live Apps Script project:

**Speed Shear Entry Manager**

Current active deployment:

**Version 4 — 28 August 2026**

Deployment rule:

1. replace the entire live file from current repository source where possible;
2. Save to Drive;
3. Deploy → Manage deployments;
4. edit active deployment;
5. choose New version;
6. deploy;
7. keep the existing web-app URL;
8. update this file + changelog with the new live version.

## System Operator Portal — implemented source, not yet live

Purpose:

One permanent private/operator page where Waimarino Shears can see and open all competitions instead of searching booking emails.

Repository source:

- `operator-portal/google-apps-script/Code.gs`
- `operator-portal/google-apps-script/Index.html`
- `operator-portal/README.md`

Architecture:

- The portal remains source-controlled inside this existing repository.
- It is designed to run in a **new/separate Google Apps Script project/web-app deployment**, not inside the existing public Speed Shear Entry Manager Apps Script project.
- It reads the same existing Google Drive folder named `Waimarino Speed Shear Entry Manager` directly using server-side `DriveApp`.
- It parses only records with `type === 'speed_shear_entry_manager_competition'`.
- It does not create, copy or maintain a second competition database.
- It does not need the Booking Receiver ↔ Entry Manager shared secret.
- It does not expose full manager/public tokens to the browser; it derives the existing 20-character short manager/public URLs server-side.

Current portal display includes:

- competition name;
- date;
- Today / Upcoming / Past lifecycle;
- venue;
- Booking Reference;
- organiser name/email/phone;
- total entry count;
- Confirmed count using the compatibility `checkedIn === true` field;
- Not Confirmed count;
- per-grade counts;
- grade limits when configured;
- grade submitted state;
- effective public entries Open / Closed state;
- overall roster status: Not submitted / Partly submitted / Submitted;
- private **Open Entry Manager** button;
- public **Open Public Entry** button;
- search, lifecycle filter and refresh controls.

Security boundary:

- The private Apps Script deployment access setting is the primary protection.
- Deploy only for the authorised Waimarino Shears operator/account; prefer **Only myself** if available in the deployment UI.
- Do **not** deploy the portal as unrestricted `Anyone` access.
- Do not put `ENTRY_MANAGER_SHARED_SECRET`, manager tokens, public tokens or another permanent access password into GitHub/client-side JavaScript.
- If an appropriately private deployment option is not available, do not weaken security just to publish it; review the deployment options first.

Current deployment state:

- GitHub/source implementation: complete as at 28 August 2026.
- Separate Apps Script project: not yet created by the operator.
- Live portal web-app URL: none yet.
- Portal must not be described as live until deployment and access restriction are tested.

The first live setup requires the operator to create the separate Apps Script project under the same Google account that owns/can access the existing Entry Manager Drive folder, paste the complete repository `Code.gs` and `Index.html`, and deploy privately.

No functional Booking Pack change is required for this portal version.

## Known technical limitation

`entry-manager.js` currently sends private manager writes using:

`fetch(..., mode:'no-cors')`

Consequences:

- browser cannot read/parse the backend response;
- manager frontend treats a successfully dispatched request as success without backend confirmation;
- errors returned by Apps Script cannot be surfaced normally to the manager UI.

This is a real robustness issue and remains open for a future hardening pass. Do not claim the manager frontend has reliable response validation until this is changed and tested.

## Roster submission / fallback files

The current design produces machine-readable JSON for timing import and printable PDF backup output. Confirmed competitors are the intended roster/submission set.

This gives the timing operator a fallback if automatic import or Raspberry Pi timing integration is unavailable.

Before changing file schemas, coordinate with the Speed Shear Timing System importer.

## Verified end-to-end competition

Latest full verification used:

- Competition: **Speedshear o ngā Taniwha**
- Booking Reference: **WS-2026-0016**
- Date: **18 September 2026**
- Venue: **Turangawaewae marae**

Verified:

- Booking Pack created the Entry Manager record.
- Private link opened correct competition.
- Public link opened correct competition.
- Existing public counts displayed correctly.
- New online entry saved centrally.
- Entry appeared in manager.
- Competitor receipt arrived.
- Organiser notification arrived.
- Waimarino Shears backup arrived.
- Custom domain worked for both private/public links.
- Old GitHub links redirected to custom domain while retaining access.

## Old `IMPLEMENTATION-NOTES.md`

That file previously described a pre-deployment state where the backend was not connected. That information is obsolete.

`PROJECT_STATE.md` is now authoritative.

## Security note

The shared Booking Receiver ↔ Entry Manager secret was exposed during development/testing conversation history. Rotate it in both Apps Script projects before final production-hardening. Do not record the replacement secret value here.

## Next planned work

Deploy and test the private **System Operator Portal** Apps Script project.

The next manual step is intentionally deployment/access setup rather than further feature work, because the source is now implemented but the actual available Google web-app access choices must be confirmed before publishing.

## Do not assume

- Do not rely on old chat memory over current repository files.
- Do not assume repository Apps Script is live until deployment version is confirmed.
- Do not expose full tokens/shared secrets unnecessarily.
- Do not regenerate competition records merely to obtain links; existing records/tokens should be reused.
- Do not resurrect the obsolete standalone “Roster Builder” workflow as the main system.
- Do not claim the System Operator Portal is live until the separate Apps Script deployment is created, access-restricted and tested.
