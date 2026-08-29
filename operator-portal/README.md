# Waimarino Shears — System Operator Portal

Private Waimarino Shears control portal for existing Speed Shear competitions.

## Source of truth

The portal does **not** create a second competition database. It reads and updates the existing JSON competition records in Google Drive folder:

`Waimarino Speed Shear Entry Manager`

The same central record is used by the System Operator Portal, Entry Manager and public competitor-entry page.

## Current live state — 29 August 2026

- **System Operator Portal: Version 17 live and user-verified.**
- **Speed Shear Entry Manager backend: Version 7 live.**
- Portal access remains **Only myself** and executes as the Waimarino Shears Google account.
- The current production portal has the responsive Waimarino Shears restyle and the new **Postpone Competition** workflow.
- Version 17 contains the final Postpone-dialog cleanup: correctly sized radio controls, no horizontal overflow, and no empty orange closing-time preview.

## Source mirror status

- `google-apps-script/Code.gs` has been synced to GitHub with the current Postpone backend.
- The live Apps Script **Version 17 `Index.html` is the authoritative UI source at this point**. The older GitHub `google-apps-script/Index.html` still needs an exact final-source mirror and must **not** be treated as the current deployed Version 17 UI until that sync is completed.
- Do not reconstruct or shorten the deployed `Index.html` from memory. Fetch/copy the exact current Apps Script file before making future Portal UI changes.

## Current interface

The portal uses a Waimarino Shears red / black / white design with the Waimarino Shears logo.

Responsive behaviour has been checked on:

- desktop/laptop;
- iPad landscape;
- iPad portrait;
- iPhone portrait;
- iPhone landscape;
- large-display/TV layouts are constrained by a sensible maximum content width.

Key presentation rules include:

- three-zone large-screen header: logo left, title centred, private-access indicator right;
- phone portrait hides the private-access indicator to avoid crowding;
- clean status-badge row;
- red top edge and stronger black outer border for each competition card;
- centred Total Entries / Confirmed / Not Confirmed statistics;
- responsive search/filter/Refresh controls;
- iPad portrait keeps Deposit / Postpone / Cancel on one equal-width row;
- phone portrait stacks operator buttons full-width.

## Portal functions

For each competition the portal can show:

- competition name and date;
- venue;
- Booking Reference;
- organiser name/email/phone;
- Active / Cancelled state;
- Postponed state;
- Awaiting Deposit / Deposit Paid;
- Today / Upcoming / Past lifecycle;
- Entries Open / Closed;
- roster submission state;
- total, Confirmed and Not Confirmed counts;
- per-grade counts and configured entry limits.

Active competitions provide:

- **Open Entry Manager**;
- **Open Public Entry**;
- **Mark Deposit Paid / Mark Awaiting Deposit**;
- **Postpone Competition**;
- **Cancel Competition**.

Cancelled competitions provide:

- **Restore Competition**;
- **Delete Permanently**.

Delete remains a two-stage lifecycle action: the competition must be cancelled first, then Delete Permanently moves the central competition JSON file to Google Drive Trash.

## Postpone Competition

Postponement is deliberately **not** a replacement for the Active / Cancelled lifecycle.

A postponed competition remains **Active**. The portal changes the date on the same central competition record and preserves:

- competitors;
- grades/events;
- Programme of Events;
- Booking Reference;
- manager/public tokens and tidy links;
- other existing competition settings.

The central record stores optional postponement history in `operatorControl`, including:

- `postponedAt`;
- `originalDate`;
- `previousDate`;
- `postponementCount`.

The card shows a **POSTPONED** badge while retaining the normal Active status.

### Online-entry closing time

If the competition uses a saved custom `entrySettings.autoCloseAt`, the Postpone dialog gives two explicit choices:

1. **Move the closing time with the competition** — shifts the saved custom closing timestamp by the same number of days as the competition date.
2. **Keep the existing closing time** — changes only the competition date and leaves the saved custom closing timestamp unchanged.

If there is no custom closing timestamp, `autoCloseAt` remains blank and the existing automatic Entry Manager rule continues to derive its closing point from the changed competition date.

The modal shows the calculated closing-time preview before saving. The preview is hidden while there is no preview text.

### Verified Postpone tests

End-to-end testing used the disposable/test competition **Speedshear o ngā Taniwha** (`WS-2026-0016`).

**Move closing time test:**

- competition date: 18 Sep 2026 → 25 Sep 2026;
- custom close: 17 Sep 2026, 5:00 pm → 24 Sep 2026, 5:00 pm;
- Portal remained Active and displayed POSTPONED;
- Entry Manager displayed the new date/cutoff;
- public competitor entry displayed the new date/cutoff;
- existing roster, grade settings and links remained intact.

**Keep closing time test:**

- competition date changed again to 28 Sep 2026;
- custom close remained 24 Sep 2026, 5:00 pm;
- Portal, Entry Manager and public competitor entry all reflected the intended state.

Both Postpone modes are therefore live-verified.

## Preferred competition links

The portal generates the same tidy links used elsewhere in the system:

- manager: `https://entries.waimarinoshears.com/manage/?c=<20-char-code>`
- public: `https://entries.waimarinoshears.com/enter/?c=<20-char-code>`

Existing full tokens are never printed in the portal UI or stored in documentation.

## Security model

The portal is a separate Google Apps Script web app.

Deployment must retain:

- Execute as: Waimarino Shears Google account;
- Who has access: **Only myself**.

Never put `ENTRY_MANAGER_SHARED_SECRET`, full manager tokens, full public tokens or another permanent access secret into this repository or browser-side code.

The portal receives only the short manager/public URLs needed by the authenticated operator. Full tokens remain in the central records.

## Files

Portal Apps Script mirror:

- `google-apps-script/Code.gs` — current Drive reader/writer, deposit/lifecycle/postpone controls, summaries, sorting and tidy URL generation.
- `google-apps-script/Index.html` — older UI mirror; see **Source mirror status** above before using it.

Related Entry Manager lifecycle enforcement:

- `../google-apps-script/OperatorControlGuard.gs`
- `../google-apps-script/WebApp.gs`

Whenever the Apps Script source changes, mirror the final deployed source here and update the root `PROJECT_STATE.md` and `CHANGELOG.md`.

## Earlier portal history

- Version 5 introduced tidy `/manage/` and `/enter/` links but accidentally omitted `operatorPortalSort_()`, so competition cards failed to load.
- Version 6 restored the sort helper without changing central records.
- The deposit / Cancel / blocked-link / Restore / Delete lifecycle was fully verified using a disposable competition before the Version 17 styling/postpone work.
