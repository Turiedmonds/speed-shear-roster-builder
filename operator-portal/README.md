# Waimarino Shears — System Operator Portal

Private operator portal for Waimarino Shears.

## Purpose

This portal gives the authorised Waimarino Shears operator one place to see and control all existing Speed Shear Entry Manager competitions.

It does **not** create a second competition database. It reads and updates the existing JSON competition records in Google Drive folder:

`Waimarino Speed Shear Entry Manager`

## Current live state — 28 August 2026

- **System Operator Portal: Version 3 live**.
- Executes as the Waimarino Shears Google account.
- Access remains **Only myself**.
- **Speed Shear Entry Manager backend: Version 5 live** with cancellation/deletion guard.
- Deposit / Cancel / blocked-link / Restore / Delete lifecycle is fully verified end-to-end using a disposable test competition.
- The repository `Index.html` now contains the uniform custom Waimarino confirmation dialogs, but that source is **not live yet**. A new portal Apps Script version must still be deployed.

## Booking / deposit workflow

The Booking Pack can create the central competition record before the organiser has paid the required deposit.

The portal tracks:

- **Awaiting Deposit** — default when no deposit status has been saved;
- **Deposit Paid** — set manually by the Waimarino Shears operator.

Marking a deposit paid does **not** automatically email or release the Entry Manager link to the organiser. Waimarino Shears still decides when to send that private link.

## Competition lifecycle controls

### Cancel Competition

Use when a booking does not proceed, including when the required deposit is not paid.

Cancellation keeps the central record for history, removes active manager/public buttons from the portal card, places the competition under the **Cancelled** filter, and Version 5 blocks the organiser Entry Manager and public competitor links server-side.

### Restore Competition

Restores the same central record and existing tokens. The same organiser/public links become available again once the record is active.

### Delete Permanently

Permanent delete intentionally requires two steps:

1. cancel the competition;
2. choose **Delete Permanently**.

This moves the central competition JSON file to Google Drive Trash. Version 5 rejects trashed records even if old token-to-file Script Property mappings still exist.

If the same Booking Reference is later legitimately created again, the setup guard clears a stale trashed reference mapping so a new record can be created.

## Uniform custom dialogs

The portal originally used browser `confirm()` for Cancel, Restore and Delete. In an Apps Script page this produced the cluttered browser heading such as **“An embedded page at … script.googleusercontent.com says”**.

Repository `google-apps-script/Index.html` now replaces those three native browser confirmations with the common Waimarino Shears modal pattern:

- white rounded card;
- Waimarino red top accent;
- dark overlay;
- Waimarino Shears branding;
- consistent action layout;
- red destructive confirmation for Cancel/Delete;
- no change to the tested lifecycle server calls.

Google sign-in, Drive authorisation and other platform security prompts cannot be restyled.

## Security model

The portal is a **separate Google Apps Script web app** from the public Entry Manager backend.

Do not put `ENTRY_MANAGER_SHARED_SECRET`, full manager tokens, full public tokens or another permanent access secret into this repository or browser-side code.

The portal receives only the short manager/public URLs needed by the authenticated operator. Full tokens remain in the central records.

Do not change the portal to unrestricted `Anyone` access.

## Files

Portal Apps Script project:

- `google-apps-script/Code.gs` — server-side Drive reader/writer and operator controls.
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

For the current pending dialog update:

1. replace the complete live Apps Script `Index.html` with the repository version;
2. save to Drive;
3. open **Deploy → Manage deployments**;
4. edit the existing deployment;
5. choose **New version**;
6. deploy while retaining the existing URL and **Only myself** access;
7. update repo docs with the new live version after confirmation.

`Code.gs` does not need to change for this popup-only update.

The portal writes to Drive, so Google may request Drive authorisation when scopes change. This dialog-only update does not add a new Drive scope.

## Normal browser use / multiple Google accounts

InPrivate was used during setup because a normal browser session with several signed-in Google accounts could route the `Only myself` Apps Script URL through the wrong account.

**InPrivate is not required for normal portal use.**

Recommended setup:

1. create a dedicated Edge or Chrome browser profile for Waimarino Shears;
2. sign only the authorised Waimarino Shears Google account into that profile;
3. bookmark the portal URL there.

This keeps the portal private while avoiding the multi-account routing problem. Do not weaken portal access to solve it.

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
