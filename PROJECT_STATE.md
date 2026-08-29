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
- Offline competitor-list fallback, deterministic offline app-shell caching and local PDF export are implemented; the new resilient offline startup/sync flow still requires the next live airplane-mode acceptance test.
- The shared Booking Receiver ↔ Entry Manager secret was rotated in both Apps Script projects on 29 August 2026. Never store or reveal its value.

## Preferred competition-specific links

Preferred user-facing links:

- private organiser Entry Manager: `https://entries.waimarinoshears.com/manage/?c=<20-char-code>`
- public competitor form: `https://entries.waimarinoshears.com/enter/?c=<20-char-code>`

Manager/public short codes remain competition-specific, type-specific and subject to the existing active/cancelled/deleted availability checks. Legacy short/full-token links remain supported.

## Central competition records

The **only permanent source of truth** remains one JSON record per competition in Google Drive folder `Waimarino Speed Shear Entry Manager`. Do not create a second online competition database.

Offline resilience uses only:

- the last competition snapshot already stored on the device; and
- a temporary ordered queue of unsynced competitor-list changes.

Those are working/offline recovery data, not a second permanent database. When connectivity returns, queued changes replay through the existing Version 7 confirmed-write path. Only after that ordered queue is empty is one controlled central refresh allowed, returning the screen to the central Drive record.

## Relationship to Booking Pack

Booking Pack repository: `Turiedmonds/waimarino-shears-speed-shear-booking-pack`.

The Booking Receiver sends the authorised competition setup to this system. The shared Script Property is `ENTRY_MANAGER_SHARED_SECRET`; never put its value in GitHub, documentation, emails or user-facing output.

## Current organiser Entry Manager behaviour

Supports booking-loaded competition details, grades/events, Programme viewer, manual/bulk/public competitors, contact details, Confirmed/Not Confirmed, global/custom public closing, per-grade controls/limits, grade reorder/collapse and roster submission to Waimarino Shears.

### Responsive grade controls

Common controls respond immediately while retaining Version 7 backend confirmation and rollback on failure. Manual Add, per-grade Online Entries On/Off, entry limits, competitor text edits and details saves avoid unnecessary whole-grade redraws.

### Resilient offline competitor mode

Frontend files:

- `entry-manager-offline.js`
- `entry-manager-offline.css`
- `entry-manager-sw.js`
- `entry-manager-bootstrap.js`
- `manage/index.html`
- `entry-manager-live-refresh.js`
- `entry-manager-local-pdf.js`

The offline scope is deliberately limited to **competitor-list operations** so an internet outage does not force entry staff back to pen and paper while avoiding unsafe offline changes to global competition settings.

Supported offline competitor work:

- Manual Add and Bulk Add;
- competitor name/town edits;
- competitor contact-detail edits;
- Confirmed/Not Confirmed changes;
- competitor removal.

These operations use the same local Entry Manager state that the screen is already using. They are queued in order for the central backend and rows with unsynced changes receive an **Offline** marker. Normal offline actions do not trigger whole-grade/page redraws beyond the existing targeted UI behaviour.

The following intentionally still require internet and are **not** faked as successful offline: closing/submitting a grade, Close All Entries, changing public-entry status/cutoff, grade settings/order and other central competition-control changes.

#### Real connectivity rather than `navigator.onLine` alone

The original offline wrapper relied too heavily on the browser's `navigator.onLine` flag. iPad/Chrome testing proved that this flag can still indicate an available connection after usable internet has disappeared. In that condition, a competitor change could be sent into the Version 7 confirmation path, wait for confirmation, then roll back. That explained test competitors disappearing and a previously entered name being restored to the Manual Entry input; the PDF button merely exposed the timing and was not the underlying data-loss cause.

`entry-manager-offline.js` v2 now performs a very small real-network probe before competitor-list writes. The service worker explicitly bypasses its cache for that probe, so a cached page cannot falsely report connectivity. If the probe fails, the competitor change is queued locally immediately instead of being sent into the normal online confirmation path.

A lightweight heartbeat also updates the Online/Offline indicator. Exact duplicate queued writes from an accidental double tap are suppressed. Queue replay remains ordered.

#### Offline reload/startup

A full offline reload previously failed because the tidy `/manage/?c=...` shell always had to contact Apps Script to resolve the short code before it could load the manager, and the Entry Manager application shell itself was not deliberately cached.

That is now addressed by:

- `entry-manager-sw.js`, a versioned service worker that pre-caches only the known Entry Manager shell/assets needed to reopen the page;
- the tidy manager route caching the already-resolved full manager token **on that same device** after a successful online resolution;
- when the resolver cannot be reached for a network/timeout reason, a previously opened competition may use that cached token and local competition snapshot;
- `entry-manager-bootstrap.js` also falls back to the saved competition when live validation cannot be reached, even if the browser incorrectly still claims it is online;
- explicit lifecycle rejections such as cancelled/not-found remain authoritative and do **not** fall back to cached access.

This means an organiser must open the competition successfully online on that device first. The offline cache does not make an unseen competition available offline.

#### Reconnect and single-source-of-truth protection

When connectivity returns:

1. the queued competitor operations are replayed **one by one in their original order** through the existing Version 7 confirmed-write wrapper;
2. a queued item is removed only after its write is confirmed (with already-applied Remove treated safely if appropriate);
3. the 30-second public-entry refresh stays blocked while any offline queue item is pending/syncing;
4. once the queue is completely empty, `entry-manager-live-refresh.js` requests **one controlled central refresh**;
5. that refresh still waits if the operator is typing, editing, using a dialog or dragging a grade, and preserves scroll.

This avoids two competing sources of truth and prevents a remote refresh from overwriting unsynced local work.

### Offline add redraw bug — fixed and user retested

Initial airplane-mode testing found a repeatable pattern where one offline manual add would work, the next add attempt would flicker and disappear, retrying that same name would work, and the following new add would fail again.

Root cause was in `entry-manager-entry-groups.js`: the Confirmed/Awaiting grouping `MutationObserver` rearranged table rows while still observing those same DOM changes. Its own row moves therefore retriggered the observer and caused repeated table rearrangement/redraw activity that could race with a new offline add.

Fix:

- the grouping observer now disconnects before rearranging divider/competitor rows;
- grouping is performed once;
- the observer is reattached only after the rearrangement is complete;
- cache version is `entry-manager-entry-groups.js?v=1.0.1`.

Follow-up user testing successfully added four offline manual competitors consecutively, confirming the original every-second-add failure was resolved.

### Local roster PDF

The per-grade **Download PDF** button is a device-side PDF generator and requires no Apps Script/backend call.

Current PDF rules:

- **confirmed competitors only**;
- header contains only **competition name, grade/event and competition date**;
- roster table contains only **No., Name and Town**;
- venue, Booking Reference, generated timestamp, Online/Manual source, confirmation-status column, offline marker and summary counts are intentionally omitted;
- columns use fixed PDF positions so the Name and Town values align under the correct headings;
- the PDF is built from the currently visible Entry Manager table, including confirmed offline additions that have not yet synced;
- PDF generation is read-only and is not allowed to refresh, replace or reset Entry Manager state;
- JSON download remains the machine-readable handover, while PDF is the human-readable emergency roster.

The earlier test where names disappeared after opening the PDF is now attributed to the old offline connectivity/rollback path rather than the PDF generator itself. The new offline connectivity flow must be retested end-to-end.

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

`entry-manager-live-refresh.js` checks the manager record every 30 seconds for genuinely new public entries. It is visually silent when nothing changed, defers visible refresh while the organiser is editing/typing/using dialogs/dragging, preserves scroll, and uses the trusted Refresh Entries path once safe. It also defers completely while the real connectivity layer reports offline or while the offline competitor queue is pending/syncing. After a complete offline sync it performs one controlled refresh using the same typing/dialog/drag protection.

## Manager cancellation access gate

Backend rejects cancelled/deleted manager and public access server-side. `entry-manager-bootstrap.js` validates manager access against the backend whenever that backend is reachable.

Offline cached access is only a resilience fallback for a competition already opened on the device. A **network/timeout failure** can use the saved copy; an explicit lifecycle rejection such as cancelled/not-found remains authoritative and prevents cached fallback. When the tidy resolver explicitly rejects the link, its locally cached short-code mapping is removed.

## Public competitor entry

Collects competitor name, hometown, grade/event, phone/email and privacy acknowledgement. At least one contact method is required. Successful entries save centrally, can receive an entry reference and email receipt, notify the organiser and send Waimarino Shears a backup copy where applicable.

Unlimited grades omit unnecessary “No entry limit” wording. Grade/Event choice uses a Waimarino custom dialog. Tidy `/enter/?c=...` submission is verified end-to-end.

## System Operator Portal — Version 6 live

Separate private Apps Script project. Uses the same central records. Includes deposit status, active/cancelled lifecycle, Cancel/Restore/Delete, filters, summaries, custom dialogs and tidy manager/public links. Access remains **Only myself**.

## Security boundary

Portal remains private. Entry Manager backend remains publicly reachable only because organisers/competitors require bearer-token links; setup requests remain protected by `ENTRY_MANAGER_SHARED_SECRET`.

The tidy manager route now stores its already-resolved manager token locally on a device so that same previously opened competition can reopen offline. This does not create a new token, does not expose it in the visible tidy URL, and does not change the bearer-access model already used by the Entry Manager.

## Verified competition baseline

Latest full verification used **Speedshear o ngā Taniwha**, Booking Reference **WS-2026-0016**, 18 September 2026, Turangawaewae marae. This is a test competition.

## Next planned work

1. While online, refresh/reopen the tidy Entry Manager once so the new service worker, application shell and resolved-token cache are installed on the device.
2. Switch to airplane mode and verify the header changes to **Offline**; add several competitors consecutively, Confirm them, Remove one, and confirm every action changes the UI immediately without flicker or rollback.
3. Still offline, generate JSON and the confirmed-only tidy PDF and confirm neither export changes the Entry Manager list.
4. Still offline, perform a full browser refresh of the tidy `/manage/?c=...` page; confirm the complete Entry Manager reopens from the saved device state rather than hanging/half-loading.
5. Reconnect. Confirm queued competitor operations sync in order, one controlled central refresh occurs only when safe, and all final entries/confirmation/removal states survive a normal refresh.
