# Timing-system roster JSON contract

The Entry Manager's roster downloads are machine-readable handover files for the Speed Shear Timing System.

## Single grade

A per-grade **Download JSON** file is a plain JSON array containing **confirmed competitors only**. Each row contains only the two fields used by the timing system:

```json
[
  { "name": "Kingston Pua", "town": "Waimana" },
  { "name": "Test A", "town": "" }
]
```

No manager token, booking reference, competition metadata, phone/email, source, confirmation flag, competitor ID or timestamp is included.

## Multiple grades

**Download Full Roster** uses the minimal multi-grade package:

```json
{
  "type": "roster_pack",
  "rosters": {
    "Intermediate": [
      { "name": "Kingston Pua", "town": "Waimana" }
    ],
    "Senior": [
      { "name": "Test 1", "town": "" }
    ]
  }
}
```

Only confirmed competitors are included in each grade.

The timing system accepts both formats from its existing **Import JSON** control. A single-grade array replaces the currently selected grade roster. A `roster_pack` replaces each named grade roster in one operation. Multi-grade import requires the named grades to already exist in the timing-system setup; this prevents a roster import from silently creating grades without programme/round rules.

Backend Entry Manager submission payloads are a separate transport contract and are not the timing-system download format.
