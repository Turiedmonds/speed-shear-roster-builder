# Waimarino Shears — Speed Shear Entries

Online entry-management system for Speed Shear competitions using the Waimarino Shears timing/entry platform.

## Live site

`https://entries.waimarinoshears.com`

Visible system names:

- **Speed Shear Entries** — overall public system
- **Entry Manager** — private organiser area
- **Speed Shear Competitor Entry** — public competitor form
- **System Operator Portal** — private Waimarino Shears admin portal

## Start here in a new ChatGPT/Codex session

Read in this order before making changes:

1. `README.md`
2. `PROJECT_STATE.md`
3. `CHANGELOG.md`

`PROJECT_STATE.md` is authoritative. Every meaningful functional, workflow, deployment, URL, data-model, email, privacy or policy change must update `PROJECT_STATE.md` and `CHANGELOG.md`. Update this README when architecture, setup or important public/operator behaviour changes.

## Architecture

The **only permanent competition source of truth** is one JSON record per competition in Google Drive folder:

`Waimarino Speed Shear Entry Manager`

The Booking Pack creates/sends the initial authorised competition setup. The Entry Manager, public competitor page and System Operator Portal all operate from that same central record.

Do not create a second independent competition database.

Booking Pack repository:

`Turiedmonds/waimarino-shears-speed-shear-booking-pack`

Timing System repository:

`Turiedmonds/SheariQ-Speed-Shear-Timing-System`

## Current production baseline — 30 August 2026

- **Speed Shear Entry Manager Apps Script: Version 9 live and roster-PDF verified.**
- **System Operator Portal Apps Script: Version 17 live and verified.**
- GitHub Pages custom domain is active.
- Tidy manager/public links are verified.
- Public competitor submission is verified end-to-end.
- Offline Entry Manager acceptance testing is complete.
- Fast reconnect service-worker v7 passed live regression testing with an observed reconnect/sync recovery of roughly **7 seconds** for one queued offline change; the current Entry Manager shell cache is now **v8** after the branded local-PDF update.
- Sanitized single-grade and Full Roster JSON downloads are live-verified.
- **Close Entries / Update Closed Entries** now attach the same sanitized single-grade `{name,town}` roster JSON used by the timing handover, while the authenticated backend submission transport remains unchanged.
- The emailed Close Entries PDF and normal per-grade **Download PDF** now use the same cleaned Waimarino branded roster design and have both been visually verified in production.
- System Operator Portal responsive styling and both Postpone closing-time choices are live-verified.
- Raspberry Pi timing-roster import remains the main outstanding integration test.

## Preferred links

Custom domain:

`https://entries.waimarinoshears.com`

Preferred competition-specific links:

- private manager: `https://entries.waimarinoshears.com/manage/?c=<20-char-code>`
- public competitor form: `https://entries.waimarinoshears.com/enter/?c=<20-char-code>`

Each short code is derived from that competition's corresponding token and resolves only through the appropriate manager/public path. Existing legacy routes remain supported for compatibility.

Never expose full manager/public bearer tokens in documentation or user-download roster files.

## Security

There is an `ENTRY_MANAGER_SHARED_SECRET` used between authorised backend components. Its value must never be retrieved, printed, committed or documented.

The **System Operator Portal** remains a separate private Apps Script web app with:

- Execute as: Waimarino Shears Google account
- Who has access: **Only myself**

Do not loosen that access model.

## Entry Manager

Current organiser features include:

- booking-loaded competition details;
- grades/events and Programme viewer;
- manual/bulk/public competitor entry;
- competitor contact details;
- Confirmed / Not Confirmed;
- global/custom public closing;
- per-grade Online Entries controls and limits;
- grade reorder/collapse;
- Close Entries / Close All Entries / Update Closed Entries;
- branded local PDF export;
- timing-roster JSON export;
- safe 30-second background refresh;
- resilient offline competitor-list fallback.

### Confirmed manager writes

The confirmed-write architecture introduced in Version 7 retains Apps Script-compatible `no-cors` POSTs but pairs each manager write with a request ID. The backend temporarily stores the real result and the frontend polls `manager-write-result`, so “request sent” is no longer treated as proof of save. Later Apps Script deployments retain this behaviour.

### Safe 30-second refresh

`entry-manager-live-refresh.js` silently checks for genuinely new public entries and waits while the organiser is typing/editing, a dialog is open, a grade is being dragged, or offline work is pending/syncing. Scroll is preserved around the controlled refresh.

### Custom online-entry countdown

Entry Manager and public competitor entry use the same saved closing timestamp.

- more than 24 hours remaining: days only;
- 24 hours or less: hours and minutes;
- exact closing date/time remains visible underneath.

The public page silently re-checks setup every 5 minutes and when returning to visibility without rebuilding or clearing the competitor form.

## Offline competitor fallback

The central Drive JSON remains the permanent source of truth. Offline mode uses only a saved competition snapshot plus a temporary ordered queue.

Supported offline competitor work:

- Manual Add / Bulk Add;
- name/town edits;
- competitor details edits;
- Confirmed / Not Confirmed;
- Remove.

Central settings such as Close Entries, public cutoff/status and grade settings/order remain online-only.

The offline layer performs a real network probe rather than trusting `navigator.onLine` alone. Service-worker caching allows a previously opened competition to reopen offline on that same device.

Current cache:

`waimarino-entry-manager-offline-v8`

Every future Entry Manager source change that affects the cached shell must bump the service-worker cache/registration version.

### Reconnect behaviour

Queued competitor changes replay in original order through the confirmed-write path. Central setup refreshes are blocked while the queue exists so an older server snapshot cannot overwrite unsynced local work.

`entry-manager-reconnect-fast.js` retries recovery every 3 seconds while recovery is needed, plus short browser-event bursts. The existing reconnect promise coalesces overlapping attempts.

Live iPad regression testing passed with roughly **7 seconds** from restoring internet to sync/Online for one queued offline competitor change, while retaining final central persistence.

## Confirmed roster PDF

The normal per-grade **Download PDF** is generated locally from the current visible table and remains usable offline. **Close Entries / Update Closed Entries** generates the corresponding emailed/server PDF from the submitted confirmed roster.

Both now use the same Waimarino branded presentation and have been visually verified in production.

Current format:

- Waimarino Shears logo and **Speed Shear Confirmed Entry Roster** heading;
- competition name;
- competition date;
- venue;
- submitted time where available;
- grade/event and confirmed count;
- confirmed competitors only;
- `# / Competitor / Hometown` table;
- no Booking Reference;
- no File Version;
- no source/status/contact columns;
- no former **BACKUP ROSTER** footer or explanatory text.

The browser Download PDF and emailed Close Entries PDF are separate generators because one must work locally/offline and one is built by Apps Script, but their user-facing layout and roster content are intentionally aligned.

## Timing-system roster JSON

Exact contract:

`ROSTER-JSON-CONTRACT.md`

Per-grade Download JSON is a plain array of confirmed competitors:

```json
[
  { "name": "Example", "town": "Raetihi" }
]
```

Download Full Roster uses:

```json
{
  "type": "roster_pack",
  "rosters": {
    "Intermediate": [
      { "name": "Example", "town": "Raetihi" }
    ]
  }
}
```

These roster files exclude manager tokens, Booking Reference, competition metadata, contact details, source, IDs, confirmation flags and timestamps.

As of Entry Manager Apps Script Version 8+, the JSON attachment generated by per-grade **Close Entries / Update Closed Entries** also uses the same simple single-grade `{name,town}` array. This changes the generated timing handover file only; the organiser-to-backend Close Entries request remains the existing authenticated submission transport.

The single-grade timing JSON and the repaired Close Entries attachment have been live-verified. Matching Pi importer changes are committed but still need to be pulled/tested on the Raspberry Pi. The multi-grade `roster_pack` Download Full Roster format was previously live-verified; Close All Entries remains a separate path to test if its generated attachment is relied on for Pi handover.

## System Operator Portal

Portal source mirror:

- `operator-portal/google-apps-script/Code.gs`
- `operator-portal/google-apps-script/Index.html`
- `operator-portal/README.md`

### Current live Version 17

Version 17 retains the existing deposit and lifecycle controls and adds the completed responsive Waimarino Shears restyle plus **Postpone Competition**.

Current controls include:

- Awaiting Deposit / Deposit Paid;
- Active / Cancelled;
- Open Entry Manager / Open Public Entry while active;
- Cancel Competition;
- Restore Competition;
- Delete Permanently after cancellation;
- Postpone Competition;
- search/filter/Refresh.

Responsive UI has been checked on desktop/laptop, iPad portrait/landscape and iPhone portrait/landscape. Large-display layouts use a sensible maximum width rather than stretching edge-to-edge.

### Postpone Competition

Postponement is **not** another main lifecycle status. The competition remains Active and the card adds a separate **POSTPONED** badge.

The same central record is retained, including roster, grades/events, Programme, Booking Reference and existing manager/public links.

Optional history stored in `operatorControl` includes:

- `postponedAt`;
- `originalDate`;
- `previousDate`;
- `postponementCount`.

When a custom `entrySettings.autoCloseAt` exists, the operator chooses either:

- **Move the closing time with the competition**; or
- **Keep the existing closing time**.

When no custom cutoff exists, the automatic date-derived rule follows the changed competition date.

Both modes have been verified end-to-end through the Portal, Entry Manager and public competitor form without losing roster/grade/link state.

See `operator-portal/README.md` for the detailed Version 17 verification record.

## Current remaining integration work

The main pending task is on the Raspberry Pi timing system:

1. `git pull` the already-committed roster importer changes when connectivity is available;
2. test single-grade JSON import;
3. test Full Roster multi-grade `roster_pack` import.

Also retain one specific Entry Manager check for later if needed: verify the generated **Close All Entries** multi-grade attachment path, because the per-grade Close/Update path is now verified but the all-grades generated attachment has not yet been screenshot-tested after the export alignment.

No further System Operator Portal styling is planned unless an actual usability/layout issue is found.
