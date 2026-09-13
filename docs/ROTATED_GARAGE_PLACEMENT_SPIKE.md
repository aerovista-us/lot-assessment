# Rotated garage placement spike

This stacked branch adds true plan rotation for detached garage placement without faking clearance through enlarged axis-aligned boxes.

## Scope

- placement footprints accept optional `rotationDeg` and are evaluated as rotated polygons;
- parcel containment, structure overlap, obstacle geometry and minimum separation use the real polygon;
- garage-door wall inference is performed in garage-local coordinates;
- parked rear-axle pose is rotated into world coordinates;
- hardened door crossing and final parked containment transform the vehicle/body against the rotated garage;
- rotated integrated garages intentionally remain unsupported until polygon subtraction exists; they fail conservatively instead of opening a false hole through a home.

## Intended next test

Use the detached Rear Garage Stack / Design #2 as the first consumer. Search small toe-in angles toward the arriving path (initially 0–15 degrees) together with bounded 1–2 ft translation. Compare continuous-forward entry, minimum fixed-obstacle clearance, door margin, parcel containment and paved area against the axis-aligned control.

The full-size 20.5×8 ft design vehicle, 25 ft minimum rear-axle radius, final enclosed parking, reverse replay and existing promotion gates remain unchanged.
