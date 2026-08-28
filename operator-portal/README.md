# Waimarino Shears — System Operator Portal

Private operator portal for Waimarino Shears.

## Purpose

This portal gives the authorised Waimarino Shears operator one place to see and control all existing Speed Shear Entry Manager competitions.

It does **not** create a second competition database. It reads and updates the existing JSON competition records in the Google Drive folder:

`Waimarino Speed Shear Entry Manager`

## Booking / deposit workflow

The Booking Pack can create the central competition record before the organiser has paid the required deposit.

The operator portal therefore tracks:

- **Awaiting Deposit** — default for records without a saved deposit status;
- **Deposit Paid** — set manually by the Waimarino Shears operator.

Marking a deposit as paid does **not** automatically email or release the Entry Manager link to the organiser. Waimarino Shears still decides when to send that private link.

## Competition lifecycle controls

### Cancel Competition

Use this when a booking does not proceed, including when the required deposit is not paid.

Cancellation:

- keeps the central competition record for audit/history;
- removes the private/public open buttons from the operator card;
- shows the competition under the **Cancelled** filter;
- is designed to block both the organiser Entry Manager link and public competitor link once the matching Entry Manager backend guard is deployed.

### Restore Competition

A cancelled competition can be restored. The same central record and existing tokens are retained.

### Delete Permanently

Permanent delete is intentionally a two-step safety action:

1. cancel the competition first;
2. then choose **Delete Permanently**.

This moves the central competition JSON file to Google Drive Trash. The Entry Manager backend guard rejects links whose central record is cancelled or trashed.

Old token-to-file Script Property mappings may remain internally after a file is trashed, but the backend guard prevents those stale links from opening the deleted record. If the same Booking Reference is later legitimately created again, the setup guard clears a stale trashed reference mapping so a new record can be created.

## Security model

The portal is a **separate Google Apps Script web app** from the public Entry Manager backend.

Live portal deployment:

- executes as the Waimarino Shears Google account;
- access is restricted to **Only myself**;
- must not be changed to unrestricted `Anyone` access.

Do not put `ENTRY_MANAGER_SHARED_SECRET`, manager tokens, public tokens or another permanent access secret into this repository or browser-side code.

The portal receives only the short manager/public URLs needed by the authenticated operator. Full tokens remain in the existing central records.

## Files

Portal project files:

- `google-apps-script/Code.gs` — server-side Drive reader/writer and operator controls.
- `google-apps-script/Index.html` — operator interface.

These belong in the separate **Waimarino Shears System Operator Portal** Apps Script project.

The cancellation/deletion link guard belongs in the existing public **Speed Shear Entry Manager** Apps Script project:

- `../../google-apps-script/OperatorControlGuard.gs`
- updated `../../google-apps-script/WebApp.gs`

## What the portal shows

For each competition:

- competition name;
- date and lifecycle (Today / Upcoming / Past);
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
- operator controls for deposit, cancellation, restore and deletion.

The portal supports search, active/cancelled/lifecycle filtering and refresh.

## Deployment order for lifecycle controls

Deploy the protection before using Cancel/Delete in production:

1. In the existing **Speed Shear Entry Manager** Apps Script project, add the complete repository file `google-apps-script/OperatorControlGuard.gs`.
2. Replace the live `WebApp.gs` with the complete current repository version.
3. Save and deploy a new Entry Manager web-app version while retaining its existing URL.
4. In the separate **Waimarino Shears System Operator Portal** Apps Script project, replace `Code.gs` and `Index.html` with the complete current repository versions.
5. Save and deploy the next portal version with **Only myself** access retained.
6. Test Cancel on a test competition and confirm its manager/public links are rejected.
7. Test Restore.
8. Only then use permanent deletion for unwanted test records.

The portal code now writes to Drive, so Google may request updated Drive permission when the new version is authorised.

## Multiple Google accounts

Because the portal is `Only myself`, a browser signed into several Google accounts can sometimes route the Apps Script URL using the wrong account and show a Google Page Not Found / unable-to-open-file screen.

Use a browser profile or session signed into the authorised Waimarino Shears Google account. Do not weaken portal access to solve this routing issue.

## Current deployment state — 28 August 2026

Live portal: **Version 1**, verified working and private.

Live Entry Manager backend: **Version 4**.

Repository source now contains the next lifecycle-control update, but it is **not live until both Apps Script projects are updated and redeployed**.
