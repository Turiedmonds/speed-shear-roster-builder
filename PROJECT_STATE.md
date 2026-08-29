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
- The shared Booking Receiver ↔ Entry Manager secret was rotated in both Apps Script projects on 29 August 2026. Never store or reveal its value.

## Preferred competition-specific links

Preferred user-facing links:

- private organiser Entry Manager: `https://entries.waimarinoshears.com/manage/?c=<20-char-code>`
- public competitor form: `https://entries.waimarinoshears.com/enter/?c=<20-char-code>`

Manager/public short codes remain competition-specific, type-specific and subject to the existing active/cancelled/deleted availability checks. Legacy short/full-token links remain supported.

## Central competition records

The source of truth remains one JSON record per competition in Google Drive folder `Waimarino Speed Shear Entry Manager`. Do not create a second competition database.

## Relationship to Booking Pack

Booking Pack repository: `Turiedmonds/waimarino-shears-speed-shear-booking-pack`.

The Booking Receiver sends the authorised competition setup to this system. The shared Script Property is `ENTRY_MANAGER_SHARED_SECRET`; never put its value in GitHub, documentation, emails or user-facing output.

## Current organiser Entry Manager behaviour

Supports booking-loaded competition details, grades/events, Programme viewer, manual/bulk/public competitors, contact details, Confirmed/Not Confirmed, global/custom public closing, per-grade controls/limits, grade reorder/collapse and roster submission to Waimarino Shears.

### Responsive grade controls

Common controls respond immediately while retaining Version 7 backend confirmation and rollback on failure. Manual Add, per-grade Online Entries On/Off, entry limits, competitor text edits and details saves avoid unnecessary whole-grade redraws.

### Competitor table grouping and programme

- Confirmed competitors are visually grouped separately from competitors still awaiting confirmation, with a clear divider/count for entry staff.
- This grouping is display-only and does not change underlying competitor sequence/draw order.
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

`entry-manager-live-refresh.js` checks the manager record every 30 seconds for genuinely new public entries. It is visually silent when nothing changed, defers visible refresh while the organiser is editing/typing/using dialogs/dragging, preserves scroll, and uses the trusted Refresh Entries path once safe. Live typing-protection test passed.

## Manager cancellation access gate

Backend rejects cancelled/deleted manager and public access server-side. `entry-manager-bootstrap.js` validates manager access before organiser scripts load, preventing stale cached screens. Production cancellation/deletion testing passed.

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

1. Smoke-test the updated adaptive countdown display after GitHub Pages publishes: >24 hours should show days only; <=24 hours should show hours/minutes.
2. Change the saved closing time while a public entry page is left open and confirm its silent 5-minute re-check updates only the countdown without disturbing typed form data.
3. Continue broader Entry Manager regression checks only when another issue is found.