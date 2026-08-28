# Waimarino Shears — System Operator Portal

Private, read-only operator portal for Waimarino Shears.

## Purpose

This portal gives an authorised Waimarino Shears operator one place to see and open all existing Speed Shear Entry Manager competitions.

It does **not** create a second competition database. It reads the existing JSON competition records from the Google Drive folder:

`Waimarino Speed Shear Entry Manager`

## Security model

The portal is intentionally a **separate Google Apps Script web app** from the public Entry Manager backend.

The public Entry Manager deployment must remain reachable by organisers and competitors. The operator portal must instead be deployed with Google access restricted to the authorised Waimarino Shears account/operator.

Do not deploy this portal as an unrestricted public web app.

Do not put `ENTRY_MANAGER_SHARED_SECRET`, manager tokens, public tokens or another permanent access secret into this repository or into browser-side code.

The portal returns only the short private/public URLs needed by the authenticated operator. Full tokens remain in the existing Drive records.

## Files

- `google-apps-script/Code.gs` — private server-side Drive reader and competition summariser.
- `google-apps-script/Index.html` — operator interface.

These files belong in a **new/separate Apps Script project**, not the existing public **Speed Shear Entry Manager** Apps Script project.

## What the portal shows

For each existing competition:

- competition name;
- date and lifecycle (Today / Upcoming / Past);
- venue;
- Booking Reference;
- organiser name/email/phone;
- total entries;
- Confirmed / Not Confirmed totals;
- per-grade counts and limits;
- public entries Open / Closed;
- roster submission status;
- **Open Entry Manager** button;
- **Open Public Entry** button.

The portal also supports search, lifecycle filtering and refresh.

## Deployment

Use the same Google account that owns or can access the existing Entry Manager Drive folder.

1. Create a new Google Apps Script project for the System Operator Portal.
2. Replace its `Code.gs` with the complete repository `Code.gs` file.
3. Add an HTML file named `Index` and paste the complete repository `Index.html` file.
4. Set the Apps Script project time zone to New Zealand/Auckland if it is not already set correctly.
5. Deploy it as a Web app.
6. Restrict web-app access to the authorised Waimarino Shears account/operator. Prefer **Only myself** when that option is available.
7. Do not use an unrestricted `Anyone` deployment.
8. Save/bookmark the resulting web-app URL as the permanent System Operator Portal link.

If the deployment screen does not offer a suitably private access option, do not weaken the security setting merely to make the page work. Review the available deployment options before publishing.

## Current deployment state

Repository source: **implemented 28 August 2026**.

Live Apps Script deployment: **not yet created/deployed**.

Do not describe the portal as live until the separate Apps Script project has been deployed and tested with the intended account restriction.
