# Waimarino Shears — System Operator Portal

Private operator portal for Waimarino Shears.

## Purpose

This portal gives the authorised Waimarino Shears operator one place to see and control all existing Speed Shear Entry Manager competitions.

It does **not** create a second competition database. It reads and updates the existing JSON competition records in Google Drive folder:

`Waimarino Speed Shear Entry Manager`

## Current live state — 29 August 2026

- **System Operator Portal: Version 5 live**.
- Version 5 was successfully deployed on **29 August 2026 at 5:33 AM** using the existing web-app deployment URL.
- Executes as the Waimarino Shears Google account.
- Access remains **Only myself**.
- **Speed Shear Entry Manager backend: Version 6 live**, deployed at 5:29 AM on 29 August 2026.
- Deposit / Cancel / blocked-link / Restore / Delete lifecycle is fully verified end-to-end using a disposable test competition.
- Version 5 retains the Version 4 custom Waimarino confirmation dialogs for Cancel, Restore and Delete.
- Version 5 now generates the preferred tidy `/manage/?c=...` and `/enter/?c=...` links directly.

## Preferred competition links

User-facing competition links are standardised as:

- private organiser Entry Manager: `https://entries.waimarinoshears.com/manage/?c=<20-char-code>`
- public competitor entry: `https://entries.waimarinoshears.com/enter/?c=<20-char-code>`

The public and manager codes are different because they come from different competition tokens. Each 20-character code resolves only against the appropriate token type and must resolve to exactly one active competition. Cancelled/deleted competitions remain blocked by the Entry Manager backend guard.

Legacy `m.html?c=...` and `e.html?c=...` links remain supported and forward to the tidy routes. Existing competition tokens do not change.

## Booking / deposit workflow

The Booking Pack can create the central competition record before the organiser has paid the required deposit.

The portal tracks:

- **Awaiting Deposit** — default when no deposit status has been saved;
- **Deposit Paid** — set manually by the Waimarino Shears operator.

Marking a deposit paid does **not** automatically email or release the Entry Manager link to the organiser. Waimarino Shears still decides when to send that private link.

## Competition lifecycle controls

### Cancel Competition

Use when a booking does not proceed, including when the required deposit is not paid.

Cancellation keeps the central record for history, removes active manager/public buttons from the portal card, places the competition under the **Cancelled** filter, and the Entry Manager backend blocks organiser/public links server-side.

### Restore Competition

Restores the same central record and existing tokens. The same organiser/public links become available again once the record is active.

### Delete Permanently

Permanent delete intentionally requires two steps:

1. cancel the competition;
2. choose **Delete Permanently**.

This moves the central competition JSON file to Google Drive Trash. The backend rejects trashed records even if old token-to-file Script Property mappings still exist.

If the same Booking Reference is later legitimately created again, the setup guard clears a stale trashed reference mapping so a new record can be created.

## Uniform custom dialogs

The portal originally used browser `confirm()` for Cancel, Restore and Delete. Version 4 replaced those browser-native prompts with the common Waimarino Shears modal pattern. Version 5 retains that presentation unchanged:

- white rounded card;
- Waimarino red top accent;
- dark overlay;
- Waimarino Shears branding;
- consistent action layout;
- red destructive confirmation for Cancel/Delete.

Google sign-in, Drive authorisation and other platform security prompts cannot be restyled.

## Security model

The portal is a **separate Google Apps Script web app** from the public Entry Manager backend.

Do not put `ENTRY_MANAGER_SHARED_SECRET`, full manager tokens, full public tokens or another permanent access secret into this repository or browser-side code.

The portal receives only the short manager/public URLs needed by the authenticated operator. Full tokens remain in the central records.

Do not change the portal to unrestricted `Anyone` access.

## Files

Portal Apps Script project:

- `google-apps-script/Code.gs` — server-side Drive reader/writer, operator controls and tidy short-link generation.
- `google-apps-script/Index.html` — operator interface and custom confirmation dialogs.

Existing public Entry Manager Apps Script project:

- `../../google-apps-script/OperatorControlGuard.gs`
- updated `../../google-apps-script/WebApp.gs`

## What the portal shows

For each competition:

- competition name;
- date and lifecycle;
- venue;
- Booking Reference;
- organiser name/email/phone;
- deposit status;
- active/cancelled status;
- total entries;
- Confirmed / Not Confirmed totals;
- per-grade counts and configured limits;
- public entries Open / Closed;
- roster submission status;
- private **Open Entry Manager** button when active;
- public **Open Public Entry** button when active;
- deposit, cancel, restore and delete operator controls.

The portal supports search, active/cancelled/lifecycle filtering and refresh.

## Deployment

Portal deployments must retain:

- Execute as: Waimarino Shears Google account;
- Who has access: **Only myself**.

Current production deployment is **Version 5** using the existing web-app deployment/URL.

Version 5 changed only the generated manager/public URL strings in `Code.gs` compared with Version 4. Lifecycle logic and custom-dialog presentation remain unchanged.

The portal writes to Drive, so Google may request Drive authorisation when scopes change. The tidy URL-generation change did not add a new Drive scope.

## Normal browser use / multiple Google accounts

InPrivate was used during setup because a normal browser session with several signed-in Google accounts could route the `Only myself` Apps Script URL through the wrong account.

**InPrivate is not required for normal portal use.**

Verified normal setup:

1. dedicated Edge profile named **Waimarino Shears**;
2. Google signed in only with the authorised Waimarino Shears account;
3. private Portal opens normally while access remains **Only myself**.

## Verified lifecycle baseline

The full lifecycle was tested on **Entry Manager Test Competition** and passed:

1. Awaiting Deposit → Deposit Paid;
2. Deposit Paid → Awaiting Deposit;
3. Cancel Competition;
4. old manager/public links blocked;
5. Restore Competition;
6. same manager/public links worked again;
7. Cancel again;
8. Delete Permanently;
9. record disappeared from the portal;
10. old manager/public links remained blocked after deletion.

That disposable test competition has now been permanently removed. Do not repeat destructive testing on real bookings.

## Version 5 verification still to do

The deployment itself is confirmed live. Do one safe UI check by refreshing the Portal and opening the public/manager buttons for an active competition, confirming the resulting browser addresses use `/enter/?c=...` and `/manage/?c=...`.
