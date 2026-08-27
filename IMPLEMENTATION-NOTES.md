# Entry Manager v2 — Implementation Notes

## Current branch status

This branch is intentionally not connected to the live Google Apps Script deployment yet.

## Competition flow

1. Booking Receiver assigns the existing Booking Reference.
2. Booking Receiver sends an authorised competition setup request to the Entry Manager backend.
3. Entry Manager backend creates one shared competition record in Google Drive.
4. Two separate random tokens are created: a private Entry Manager token and a public competitor-entry token.
5. Waimarino Shears receives the private/public links internally.
6. The organiser does not receive the Entry Manager link automatically with the booking request.
7. Payment/deposit remains the point at which Waimarino Shears chooses to release the links.

## Entry Manager

- Competition identity and grades/events load from booking data.
- Manual individual entry and bulk entry are always available to Entry Manager staff.
- Manual entry is not blocked when the public competitor link is closed.
- Public, manual and imported competitors live in the same central competition record.
- Check-in status is stored centrally and shared across devices.
- Phone/email is available to entry staff but excluded from timing-system roster JSON.
- Grade and full submissions include checked-in competitors only and warn about unchecked names.
- Grade submissions can be updated/resubmitted later.

## Public entry controls

- Public competitor entries can be manually opened or closed.
- Closing can be temporary while retaining the scheduled cutoff, or the custom cutoff can be removed explicitly.
- The operator can set a custom closing date/time.
- If no custom closing date/time is set, the final fallback shutdown is 12 hours after the competition day ends.
- Manual Entry Manager entry remains available after any public cutoff.

## Grade-level controls

Each grade/event has central public-entry settings:

- public open/closed status
- optional entry limit
- current entry count
- submitted status

Public entry counts include both manual and public competitors so the displayed capacity is the true competition total.

When a grade reaches its optional limit it stops accepting public entries. The backend checks capacity while holding a lock, preventing two simultaneous public submissions from both taking the final place.

Submitting a grade automatically marks that grade Submitted and closes it to public entry. Manual Entry Manager additions remain possible and the grade can later be resubmitted.

When every grade/event has been submitted, the Entry Manager prompts the operator to close the overall public competitor link. Even if the link is left accessible, no submitted grade is selectable for public entry.

## Public competitor entry form

The competition name is the main identity. Waimarino Shears branding is kept light. The form collects:

- name
- hometown
- grade/event
- mobile number
- email address
- privacy acknowledgement

The form displays live grade availability, for example `Junior — 21 of 24 — 3 places left`. Submitted, closed and full grades cannot be selected.

The form refreshes availability immediately before submission. The backend checks the grade again under a lock and returns the final result through a short-lived submission-result check, allowing the competitor to be told if the last place was taken while they were filling in the form.

A public submission is stored as Not Checked In and does not confirm payment.

## Privacy

The public form states the collection purpose and provides Waimarino Shears contact details for access/correction requests. Contact information is retained in the competition record but excluded from timing-system roster submissions.

## Deployment still required later

1. Create/deploy the Entry Manager Google Apps Script web app.
2. Configure `ENTRY_MANAGER_SHARED_SECRET` in both Apps Script projects.
3. Put the deployed Entry Manager endpoint into `entry-manager.js`, `competitor-entry.js`, and Booking Pack `EntryManagerHandoff.gs`.
4. Enable the Booking Pack handoff only after testing.
5. Wire the private manager/public competitor links into the internal Waimarino Shears booking email.
6. Test a complete booking, online entry, limits, check-in, grade closure and roster submission flow.
7. Change the organiser-facing URL to the final clean Waimarino Shears URL after the workflow is proven.
