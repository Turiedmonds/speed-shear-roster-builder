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
- **System Operator Portal Apps Script: Version 6 live.**
- Tidy manager/public URLs are verified live and full public submission is verified end-to-end.
- Entry Manager includes a safe 30-second silent background public-entry check; typing-protection smoke test passed.
- Responsive grade controls, competitor grouping, public grade polish and Programme button repair have been implemented; Programme repair and grouping/polish were user-verified.
- A custom online-entry closing countdown is implemented on both Entry Manager and public competitor entry using the same saved closing timestamp.
- Offline manual-competitor fallback and local PDF export are implemented and undergoing live smoke testing.
- The shared Booking Receiver ↔ Entry Manager secret was rotated in both Apps Script projects on 29 August 2026. Never store or reveal its value.

## Preferred competition-specific links

Preferred user-facing links:

- private organiser Entry Manager: `https://entries.waimarinoshears.com/manage/?c=<20-char-code>`
- public competitor form: `https://entries.waimarinoshears.com/enter/?c=<20-char-code>`

Manager/public short codes remain competition-specific, type-specific and subject to the existing active/cancelled/deleted availability checks. Legacy short/full-token links remain supported.

## Central competition records

The online source of truth remains one JSON record per competition in Google Drive folder `Waimarino Speed Shear Entry Manager`. Do not create a second online competition database.

The offline fallback is intentionally a temporary device-local queue, not a second permanent source of truth. Once connectivity returns, queued competitor changes are replayed to the existing central record.

## Relationship to Booking Pack

Booking Pack repository: `Turiedmonds/waimarino-shears-speed-shear-booking-pack`.

The Booking Receiver sends the authorised competition setup to this system. The shared Script Property is `ENTRY_MANAGER_SHARED_SECRET`; never put its value in GitHub, documentation, emails or user-facing output.

## Current organiser Entry Manager behaviour

Supports booking-loaded competition details, grades/events, Programme viewer, manual/bulk/public competitors, contact details, Confirmed/Not Confirmed, global/custom public closing, per-grade controls/limits, grade reorder/collapse and roster submission to Waimarino Shears.

### Responsive grade controls

Common controls respond immediately while retaining Version 7 backend confirmation and rollback on failure. Manual Add, per-grade Online Entries On/Off, entry limits, competitor text edits and details saves avoid unnecessary whole-grade redraws.

### Offline manual competitor fallback

Frontend files:

- `entry-manager-offline.js`
- `entry-manager-offline.css`
- `entry-manager-local-pdf.js`

The offline scope is deliberately limited to **competitor-list operations** so an internet outage does not force entry staff back to pen and paper while avoiding unsafe offline changes to global competition settings.

When the Entry Manager page is already loaded and internet is lost:

- an **Offline** indicator appears in the header;
- manual competitor Add/Bulk Add remains usable;
- competitor name/town edits, contact-detail edits, Confirmed/Not Confirmed changes and competitor removal are retained locally;
- those operations are queued in localStorage for that competition rather than being rolled back when the backend cannot be reached;
- rows with unsynced competitor changes receive an **Offline** marker;
- existing competitors already loaded before the outage remain in the locally saved competition state;
- queued competitor operations automatically replay through the normal Version 7 confirmed-write path when connectivity returns;
- the 30-second public-entry refresh will not rebuild the manager while an offline queue is waiting/syncing, preventing unsynced local entries from being overwritten.

The following intentionally still require internet and are **not** faked as successful offline: closing/submitting a grade, Close All Entries, changing public-entry status/cutoff, grade settings/order and other central competition-control changes.

`entry-manager-bootstrap.js` can load cached competition data when the browser explicitly reports offline and the competition was previously saved on that device. This does not guarantee a completely cold offline reload if the browser has discarded the application files from its own cache; the primary resilience target is an Entry Manager already loaded before connectivity is lost.

### Offline add redraw bug — fixed, then user retested consecutive additions

Initial airplane-mode testing found a repeatable pattern where one offline manual add would work, the next add attempt would flicker and disappear, retrying that same name would work, and the following new add would fail again.

Root cause was in `entry-manager-entry-groups.js`: the Confirmed/Awaiting grouping `MutationObserver` rearranged table rows while still observing those same DOM changes. Its own row moves therefore retriggered the observer and caused repeated table rearrangement/redraw activity that could race with a new offline add.

Fix:

- the grouping observer now disconnects before rearranging divider/competitor rows;
- grouping is performed once;
- the observer is reattached only after the rearrangement is complete;
- cache version is `entry-manager-entry-groups.js?v=1.0.1`.

Follow-up user test then successfully added four offline manual competitors consecutively, confirming the original every-second-add failure was resolved.

### Offline PDF/export roster preservation

A follow-up airplane-mode test found a separate bug: four locally queued offline competitors remained visible and could all be marked Confirmed, and the generated PDF correctly included all ten confirmed competitors, but returning from the PDF/file-viewer flow caused the four offline rows to disappear from the Entry Manager UI.

The PDF/export path was hardened so export is read-only from the operator's point of view and cannot become a roster-reset trigger:

- `entry-manager-local-pdf.js` now builds the PDF directly from the **currently visible grade table**, rather than depending on an older localStorage snapshot;
- immediately before PDF handoff, `entry-manager-offline.js` snapshots the currently visible competitor rows back into the cached competition state;
- the same snapshot protection runs on page hide/visibility changes so Safari/iOS handing the PDF to its viewer does not lose locally queued names;
- a short export guard prevents the 30-second background refresh from running around the PDF handoff/return window;
- queued offline removals are respected when the visible roster is snapshotted;
- offline Remove continues through the normal Entry Manager action but uses the immediate offline queue path and the visible state is snapshotted immediately after removal.

This change is frontend-only and still requires a live airplane-mode retest after GitHub Pages publishes.

### Local roster PDF

The per-grade **Download PDF** button is a device-side PDF generator and requires no Apps Script/backend call.

Current PDF rules:

- **confirmed competitors only**;
- header contains only **competition name, grade/event and competition date**;
- roster table contains only **No., Name and Town**;
- venue, Booking Reference, generated timestamp, Online/Manual source, confirmation-status column, offline marker and summary counts are intentionally omitted;
- columns use fixed PDF positions so the Name and Town values align under the correct headings;
- the PDF is generated directly from the visible Entry Manager table, including confirmed offline additions that have not yet synced;
- JSON download remains the machine-readable handover, while PDF is the human-readable emergency roster.

### Competitor table grouping and programme

- Confirmed competitors are visually grouped separately from competitors still awaiting confirmation, with a clear divider/count for entry staff.
- This grouping is display-only and does not change underlying competitor sequence/draw order.
- Added explicit spacing between the group label and count so the divider reads e.g. **Confirmed 5**, not `Confirmed5`.
- The Programme button opens the Booking Pack Programme of Events.
- The 29 August Programme initialization bug caused by dynamically loading after `DOMContentLoaded` has been repaired and user-verified.

### Custom online-entry closing countdown

The existing custom closing time remains one universal online-entry cutoff across all grades. Per-grade **On / Off** controls provide finer control before that universal cutoff.

Frontend countdown source:

- `entry-manager-countdown.js`
- `competitor-entry-countdown.js`
- shared styling in `entry-countdown.css`

Behaviour:

- both displays use the existing saved `entrySettings.autoCloseAt` / public `autoCloseAt` timestamp; there is no second timer or duplicate closing-time source of truth;
- Entry Manager shows remaining time, exact closing date/time and how many grades are currently accepting online entries; its countdown can be clicked to focus the existing closing-time setting;
- public competitor form shows remaining time and exact closing date/time near the competition header;
- countdown display uses two simple modes: when **more than 24 hours** remain it shows **days only**; at **24 hours or less** it shows **hours and minutes**; the exact closing date/time remains underneath in both modes;
- local countdown calculation is always `saved closing timestamp - Date.now()`, avoiding accumulated timer drift;
- public page performs a **silent setup re-check every 5 minutes** and once when the page becomes visible again, so a closing-time change can be picked up without requiring a manual refresh;
- that 5-minute re-check does **not** reload/rebuild the page and does not read, clear, replace or focus any competitor form fields; if the timestamp changed, only the countdown timestamp/display changes;
- failed background re-checks are silent and cannot interrupt competitor entry/submission;
- colour emphasis changes within 24 hours, within 6 hours and after closing;
- if there is no custom closing time, the custom countdown stays hidden and the existing default final shutdown remains unchanged;
- this remains frontend-only and requires no Apps Script redeployment.

### Silent Entry Manager public-entry background refresh

`entry-manager-live-refresh.js` checks the manager record every 30 seconds for genuinely new public entries. It is visually silent when nothing changed, defers visible refresh while the organiser is editing/typing/using dialogs/dragging, preserves scroll, and uses the trusted Refresh Entries path once safe. It also defers completely while offline, while the offline competitor queue is pending/syncing, and during the short local-PDF export guard window. Live typing-protection test passed for the original polling behaviour.

## Manager cancellation access gate

Backend rejects cancelled/deleted manager and public access server-side. `entry-manager-bootstrap.js` validates manager access before organiser scripts load when online, preventing stale cached screens. Production cancellation/deletion testing passed.

The offline cached-state fallback only applies when the browser explicitly reports no connection and cached competition data exists locally. It does not replace the server-side lifecycle guard when connectivity is available.

## Public competitor entry

Collects competitor name, hometown, grade/event, phone/email and privacy acknowledgement. At least one contact method is required. Successful entries save centrally, can receive an entry reference and email receipt, notify the organiser and send Waimarino Shears a backup copy where applicable.

Unlimited grades omit unnecessary “No entry limit” wording. Grade/Event choice uses a Waimarino custom dialog. Tidy `/enter/?c=...` submission is verified end-to-end.

## System Operator Portal — Version 6 live

Separate private Apps Script project. Uses the same central records. Includes deposit status, active/cancelled lifecycle, Cancel/Restore/Delete, filters, summaries, custom dialogs and tidy manager/public links. Access remains **Only myself**.

## Security boundary

Portal remains private. Entry Manager backend remains publicly reachable only because organisers/competitors require bearer-token links; setup requests remain protected by `ENTRY_MANAGER_SHARED_SECRET`.

## Verified competition baseline

Latest full verification used **Speedshear o ngā Taniwha**, Booking Reference **WS-2026-0016**, 18 September 2026, Turangawaewae marae. This is a test competition.

## Next planned work

1. After GitHub Pages publishes, repeat the same airplane-mode test: add several manual competitors, mark them Confirmed, generate the PDF, return to Entry Manager and confirm none disappear.
2. Confirm the new PDF contains only competition name, grade, date and the aligned No./Name/Town table, with only confirmed competitors included.
3. While still offline, remove one competitor and confirm the row disappears immediately and stays removed locally.
4. Reconnect and confirm all remaining offline additions/confirmation changes/removals sync and survive a normal refresh.