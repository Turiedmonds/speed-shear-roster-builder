# Entry Manager v3 — Implementation Notes

## Current status

The redesigned Entry Manager frontend is live on GitHub Pages. The Google Apps Script backend code is prepared in this repository but is not connected to the live frontend yet.

## Competition flow

1. Booking Receiver assigns the existing Booking Reference.
2. Booking Receiver sends an authorised competition setup request to the Entry Manager backend.
3. Entry Manager backend creates one shared competition record in Google Drive.
4. Two separate random tokens are created: a private Entry Manager token and a public competitor-entry token.
5. Waimarino Shears receives the private/public links internally.
6. The organiser does not receive the Entry Manager link automatically with the booking request.
7. Payment/deposit remains the point at which Waimarino Shears chooses to release the links.

## Dashboard layout

- Public competitor-entry controls are inside a Settings panel rather than permanently filling the main screen.
- Add Grade / Event is a separate setup card.
- Grade/event cards can be collapsed or expanded.
- Grade/event cards can be moved up or down into the organiser's preferred running order.
- Saved grade order is also used by the backend/public form once connected.
- Helper explanations are moved behind contextual help controls where possible.

## Competitor entry and confirmation

- Manual individual entry and bulk entry remain available at all times.
- Quick manual entry only needs competitor name and hometown.
- Phone/email is optional for manual competitors.
- Public-entry competitors can supply phone/email.
- Contact information is removed from the main roster table and available through a Details control instead.
- Main table columns are: number, name, town, Checked / Paid, Details and Remove.
- The organiser uses one clear status control: Not Confirmed or Confirmed.
- Confirmed means the organiser is satisfied that the competitor is ready to be included under their own payment/attendance process.
- Internally the existing `checkedIn` data field is retained for backwards compatibility, but the operator-facing wording is Confirmed.

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

Public entry counts include both manual and public competitors so displayed capacity reflects the actual competition total.

When a grade reaches its optional limit it stops accepting public entries. The backend checks capacity while holding a lock, preventing two simultaneous public submissions from both taking the final place.

Submitting a grade automatically marks that grade Submitted and closes it to public entry. Manual Entry Manager additions remain possible and the grade can later be resubmitted.

When every grade/event has been submitted, the Entry Manager prompts the operator to close the overall public competitor link.

## Submission files and fallback PDF

Every roster submission is designed to produce two files once Apps Script is connected:

- JSON — machine-readable timing-system import file.
- PDF — human-readable printable backup roster.

The PDF follows the Waimarino Shears Booking Pack visual style with logo, red/black branding, competition details and clean grade tables. It includes only confirmed competitors and intentionally excludes phone/email.

The JSON and PDF are both saved to the Entry Manager Drive folder and attached to the Waimarino Shears submission email. This gives the timing crew a printable/manual fallback if timing-system import or the Raspberry Pi is unavailable.

## Public competitor entry form

The competition name is the main identity and Waimarino Shears branding is kept light. The form collects name, hometown, grade/event, mobile number, email address and privacy acknowledgement.

The form displays live grade availability, for example `Junior — 21 of 24 — 3 places left`. Submitted, closed and full grades cannot be selected.

## Deployment still required later

1. Create/deploy the Entry Manager Google Apps Script web app using the repository Apps Script files, including `EntryManagerV3.gs`.
2. Configure `ENTRY_MANAGER_SHARED_SECRET` in both Apps Script projects.
3. Put the deployed Entry Manager endpoint into `entry-manager.js`, `competitor-entry.js`, and Booking Pack `EntryManagerHandoff.gs`.
4. Enable the Booking Pack handoff only after testing.
5. Wire the private manager/public competitor links into the internal Waimarino Shears booking email.
6. Test complete booking, online entry, limits, confirmation, reordering, grade closure, JSON and PDF submission flows.
7. Change the organiser-facing URL to the final clean Waimarino Shears URL after the workflow is proven.
