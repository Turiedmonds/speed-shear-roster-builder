# Entry Manager — Implementation Notes

> **Current-state warning:** this file previously contained pre-deployment notes that said the backend was not yet connected. That information is now obsolete.

The authoritative current production handoff is now:

1. `README.md`
2. `PROJECT_STATE.md`
3. `CHANGELOG.md`

## Current production status

As at 28 August 2026:

- the Entry Manager backend is live and connected;
- Booking Pack → Entry Manager competition creation is live;
- public competitor entry is live;
- competitor receipt email is live;
- organiser new-entry notification is live;
- Waimarino Shears backup notification is live;
- custom domain `https://entries.waimarinoshears.com` is live;
- private/public custom-domain links have been tested successfully;
- Speed Shear Entry Manager Apps Script is deployed as **Version 4**.

## Maintenance rule

Do not add new current-state information only to this file.

For every meaningful future change:

- update `PROJECT_STATE.md`;
- add a dated entry to `CHANGELOG.md`;
- update `README.md` when architecture, deployment or public behaviour changes.

This file remains only so old references to `IMPLEMENTATION-NOTES.md` do not lead a future session into the obsolete pre-deployment state.
