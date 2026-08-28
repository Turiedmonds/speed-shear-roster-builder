# Waimarino Shears — System Operator Portal

Private operator portal for Waimarino Shears.

## Purpose

This portal gives the authorised Waimarino Shears operator one place to see and control all existing Speed Shear Entry Manager competitions.

It does **not** create a second competition database. It reads and updates the existing JSON competition records in Google Drive folder:

`Waimarino Speed Shear Entry Manager`

## Current live state — 28 August 2026

- **System Operator Portal: Version 3 live**.
- Version 2 was an intermediate deployment containing the updated `Code.gs` only.
- Version 3 contains both updated portal files (`Code.gs` and `Index.html`).
- Executes as the Waimarino Shears Google account.
- Access remains **Only myself**.
- **Speed Shear Entry Manager backend: Version 5 live** with cancellation/deletion guard.
- Portal Version 3 / backend Version 5 still require functional Cancel / blocked-link / Restore / Delete testing on a test competition before the lifecycle controls are treated as fully verified.

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

## Security model

The portal is a **separate Google Apps Script web app** from the public Entry Manager backend.

Do not put `ENTRY_MANAGER_SHARED_SECRET`, full manager tokens, full public tokens or another permanent access secret into this repository or browser-side code.

The portal receives only the short manager/public URLs needed by the authenticated operator. Full tokens remain in the central records.

Do not change the portal to unrestricted `Anyone` access.

## Files

Portal Apps Script project:

- `google-apps-script/Code.gs` — server-side Drive reader/writer and operator controls.
- `google-apps-script/Index.html` — operator interface.

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

Portal deployments should retain:

- Execute as: Waimarino Shears Google account;
- Who has access: **Only myself**.

When portal source changes, replace the complete `Code.gs` and `Index.html`, Save to Drive, then edit the existing deployment and choose **New version** so the web-app URL stays the same.

The portal writes to Drive, so Google may request Drive authorisation when scopes change.

## Multiple Google accounts

Because the portal is `Only myself`, a browser signed into several Google accounts can sometimes route the Apps Script URL using the wrong account and show Google Page Not Found / unable-to-open-file.

Use a browser profile or session signed into the authorised Waimarino Shears account. Do not weaken portal access to solve this routing issue.

## Required verification after Version 3

Use a test competition only:

1. confirm the Version 3 UI shows Awaiting Deposit / Deposit Paid and operator controls;
2. mark Deposit Paid and back to Awaiting Deposit;
3. Cancel Competition;
4. verify its old manager and public links are blocked;
5. Restore Competition and verify those same links work again;
6. Cancel again;
7. Delete Permanently;
8. verify the record disappears from the portal and old links remain blocked.
