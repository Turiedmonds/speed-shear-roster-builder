# Entry Manager v2 — Implementation Notes

## Current branch status

This branch is intentionally not connected to the live Google Apps Script deployment yet.

## Competition flow

1. Booking Receiver assigns the existing Booking Reference.
2. Booking Receiver sends an authorised competition setup request to the Entry Manager backend.
3. Entry Manager backend creates one competition record in Google Drive.
4. Two separate random tokens are created:
   - private Entry Manager token
   - public competitor-entry token
5. The Waimarino Shears internal booking email receives both links.
6. The organiser receives neither link automatically with the booking-request confirmation.
7. Payment/deposit remains the point at which Waimarino Shears chooses to release the links.

## Entry Manager

- Competition name/date/venue/Booking Reference can load from booking data.
- Grades/events load from the booking configuration.
- Manual individual entry remains available.
- Bulk paste remains available.
- Online competitor entries can be refreshed from the backend.
- Competitor phone/email is visible to entry staff for contact purposes.
- Competitors are Not Checked In by default.
- Staff can mark each competitor Checked In.
- Grade submission and full submission include only checked-in competitors.
- A warning lists unchecked competitors before submission.
- Timing-system JSON contains only name and town, not phone/email.
- Backup JSON downloads remain available.

## Public competitor entry form

The public form deliberately has light Waimarino Shears branding. The competition name is the main heading. It collects:

- name
- hometown
- grade/event
- mobile number
- email address
- privacy acknowledgement

At least one contact method is required. A public submission is stored as Not Checked In and does not confirm payment.

## Privacy

The public form states the collection purpose and provides Waimarino Shears contact details for access/correction requests. Contact information is retained in the competition record but excluded from timing-system roster submissions.

## Deployment still required later

1. Create/deploy the Entry Manager Google Apps Script web app.
2. Configure `ENTRY_MANAGER_SHARED_SECRET` in both Apps Script projects.
3. Put the deployed Entry Manager endpoint into:
   - `entry-manager.js`
   - `competitor-entry.js`
   - Booking Pack `EntryManagerHandoff.gs`
4. Enable the Booking Pack handoff only after testing.
5. Wire the returned links into the internal Waimarino Shears booking email.
6. Test a complete booking, online entry, check-in and roster submission.
7. Change the organiser-facing URL to the final clean Waimarino Shears URL after the workflow is proven.
