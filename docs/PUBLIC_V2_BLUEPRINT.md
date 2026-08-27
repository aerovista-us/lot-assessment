# LotScope Public v2 Blueprint

Status: READY FOR IMPLEMENTATION
Scope: Public surface only (`/`), sharing the existing LotScope deterministic engine and leaving `/workbench` intact.

## Product goal

Evolve LotScope from a manual feasibility calculator into a visual early-site-planning assistant while preserving the current promise: **Can I Build That Here?**

The public app should remain approachable to a homeowner or small developer. It should not become CAD. The user should be able to enter known facts, see the site, draw or edit the lot, place conceptual buildings, move them around, and understand in real time what is working and what is constrained.

## Core principle

**One geometry model, multiple public views.**

The public UI may edit a lightweight `SiteModel`; the shared geometry engine remains authoritative for containment, setback, coverage, collision and later access checks. Screen pixels never become source-of-truth geometry. All model geometry is stored in feet.

## Public v2 user journey

1. **Describe Property**
   - Quick Rectangle or Draw Lot
   - dimensions / custom polygon
   - frontage edge
   - setbacks
   - coverage

2. **Describe Project**
   - unit count
   - target living area
   - stories
   - garage spaces
   - basic access assumptions

3. **Concept Canvas**
   - visible one-foot grid
   - parcel polygon
   - frontage marker
   - setback/buildable envelope
   - conceptual building footprints
   - drag / resize / duplicate / delete
   - live containment and coverage feedback

4. **Assess**
   - feasibility score
   - information confidence
   - visual conflict overlays
   - plain-English explanation

5. **Improve**
   - duplicate concept
   - try alternate placement
   - later: bounded repair / generated alternatives

6. **Save / Share**
   - browser-local concept persistence first
   - shareable summary later

---

# Release blueprint

## v2.0 — Guided Assessment

Purpose: improve the existing public calculator before adding richer geometry.

### UI changes

Replace the current flat field wall with four grouped sections:

- **LOT** — width, depth, lot mode
- **RULES** — front/rear/side setbacks, coverage
- **PROJECT** — units, living area, stories, garages
- **ACCESS** — driveway width, minimum access assumption

Add mode selector:

- `QUICK RECTANGLE`
- `DRAW LOT`

Add two independent result concepts:

- **Feasibility** — existing score/status logic
- **Information confidence** — confirmed / user supplied / assumed / unknown

### Acceptance

- Existing assessment behavior remains available.
- No automatic zoning facts are invented.
- Mobile remains usable.
- Existing analytics continue working.

---

## v2.1 — Concept Canvas

Purpose: let a user visually test conceptual building placement.

### Must-have tools

- SVG world-space canvas
- 1 ft major snap grid; optional 5 ft emphasized grid
- pan / fit-to-site; zoom if needed after first pass
- rectangular parcel auto-generation
- custom parcel polygon drawing
- close polygon action
- draggable parcel vertices
- designate frontage edge
- automatic buildable-envelope projection from setbacks
- add Building object
- drag building
- resize building using handles
- duplicate building
- delete building
- undo / redo
- live dimensions
- live lot coverage
- buildable-envelope conflict highlight
- object-outside-parcel conflict highlight
- local browser persistence

### Explicitly out of scope

- room plans
- interior walls
- windows / doors
- roof design
- structure
- photoreal
- grading
- utilities
- permit decisions

### Canvas behavior

When a building is moved:

- valid placement: normal / positive outline
- inside parcel but outside buildable envelope: warning/red overlay
- outside parcel: hard conflict
- coverage over limit: coverage status changes immediately

The canvas should explain the conflict with numbers when possible, not only color.

Example:

`Building B crosses the north buildable boundary by 2.4 ft.`

### Acceptance

A user can draw a custom lot, mark the street edge, place two buildings, move/resize them, and see accurate setback/coverage feedback without invoking Workbench.

---

## v2.2 — Access Canvas

Purpose: make the concept editor aware of basic site circulation.

### Add objects

- Garage
- garage door face/orientation
- Driveway polyline
- driveway width
- reserved/easement zone

### Checks

- driveway corridor inside parcel where required
- remaining side corridor width
- garage approach relationship
- building/drive overlap
- simple path clearance

Full swept-path / FS-SUV analysis may remain an advanced action using the existing circulation package rather than running continuously on every drag event.

### Acceptance

A user can place a garage and driveway and receive basic access warnings that map directly to shared engine rules.

---

## v2.3 — Smart Alternatives

Purpose: expose carefully selected Workbench capabilities to public users without exposing solver complexity.

### Actions

- `TRY A BETTER PLACEMENT`
- `DUPLICATE CONCEPT`
- `COMPARE A / B`
- `GENERATE PLACEMENT IDEAS`

### Bounded repair behavior

Public UI may ask the engine for a small correction and display a ghost suggestion, for example:

`Move Building B 1.5 ft north to restore the required side corridor.`

User must explicitly apply the suggestion.

### Candidate presentation

Never show hundreds of solver states. Return a small diverse set with short reasons:

- Best access
- Best usable yard
- Simplest footprint
- Best balance

---

# Technical blueprint

## Canonical public editing model

```ts
export type SiteModel = {
  version: string;
  units: "ft";
  parcel: {
    points: [number, number][];
    frontageEdgeIndex: number | null;
  };
  rules: {
    setbacksByEdgeFt: number[];
    maxCoveragePct?: number;
  };
  objects: SiteObject[];
  viewport?: {
    center: [number, number];
    scale: number;
  };
};

export type SiteObject =
  | BuildingObject
  | GarageObject
  | DrivewayObject
  | ReservedZoneObject;
```

All measurements are world-space feet. React/SVG transforms feet into screen coordinates.

## Suggested code layout

```text
app/
  page.tsx

components/public/
  GuidedAssessment.tsx
  ConceptCanvas.tsx
  CanvasToolbar.tsx
  SiteInspector.tsx
  ResultSummary.tsx
  ConfidencePanel.tsx

packages/
  public-model/
    index.ts
  canvas/
    transforms.ts
    snapping.ts
    interactions.ts
  geometry/          # existing shared package
  placement/         # existing shared package
  circulation/       # existing shared package

lib/
  assessment.ts      # existing quick-assessment path
```

Do not create a second geometry engine inside the canvas components.

## SVG layer stack

Recommended rendering order:

1. background grid
2. parcel fill/boundary
3. setback lines
4. buildable envelope
5. easements/reserved zones
6. driveways
7. buildings/garages
8. conflict overlays
9. dimensions
10. selected-object handles
11. labels / frontage marker

## Interaction model

Tools:

- Select
- Draw Lot
- Add Building
- later: Add Garage
- later: Draw Drive

Keyboard:

- Delete / Backspace — remove selected
- Escape — cancel current tool
- Ctrl/Cmd+Z — undo
- Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y — redo
- Arrow keys — optional 1 ft nudge when object selected

Pointer drag should snap in world feet rather than screen pixels.

## State strategy

Use a reducer/history model rather than many independent React states:

```ts
CanvasState {
  site: SiteModel;
  selectedId: string | null;
  activeTool: Tool;
  history: SiteModel[];
  future: SiteModel[];
}
```

Persist the current `SiteModel` to localStorage with a schema version. Never persist transient pointer state.

---

# Public layout blueprint

Desktop:

```text
┌──────────────────────────────────────────────────────────────────────┐
│ LotScope                                            Reset / Save     │
├──────────────────────────────────────────────────────────────────────┤
│ Can I build that here?                                                │
│ Describe it, place it, and see the constraints before redesign.      │
├──────────────────┬──────────────────────────────────────┬─────────────┤
│ PROPERTY/PROJECT │                                      │ INSPECTOR   │
│                  │          CONCEPT CANVAS              │             │
│ Lot              │                                      │ Selected    │
│ Rules            │             grid                     │ dimensions  │
│ Project          │          parcel/buildings            │ status      │
│ Access           │                                      │             │
├──────────────────┴──────────────────────────────────────┴─────────────┤
│ POSSIBLE 82  ·  Confidence MEDIUM  ·  Coverage 38/45%                │
│ ✓ fits envelope   ⚠ access assumption needs verification             │
└──────────────────────────────────────────────────────────────────────┘
```

Tablet/mobile should switch to tabs or stacked panels:

- Facts
- Canvas
- Results

Do not squeeze a desktop three-column editor onto phones.

---

# Visual direction

Retain the existing LotScope dark/AeroVista Local visual language, but make the canvas feel more like a technical field instrument:

- fine neutral grid
- slightly brighter 5 ft grid
- amber selected geometry
- restrained green valid state
- restrained red hard conflict
- dashed setback/buildable boundaries
- clear monochrome dimensions
- no decorative gradients inside the actual site drawing area

The canvas should visually read closer to a survey/sketch pad than a marketing illustration.

---

# Confidence + provenance blueprint

Each important fact should eventually carry:

```ts
{
  value,
  state: "CONFIRMED" | "USER_SUPPLIED" | "ASSUMED" | "UNKNOWN",
  source?: string,
  verifiedAt?: string
}
```

The public result should show both:

- `FEASIBILITY: 82/100`
- `INFORMATION CONFIDENCE: MEDIUM`

A strong geometric result based on unverified setbacks must never visually imply regulatory approval.

---

# Implementation order

### Pass 1 — public shell cleanup
1. Split current `app/page.tsx` into components.
2. Group inputs.
3. Add Quick Rectangle / Draw Lot mode UI.
4. Add confidence skeleton.
5. Preserve existing `assessLot()` behavior.

### Pass 2 — geometry canvas foundation
1. Add `packages/public-model`.
2. Add SVG transform/grid layer.
3. Render rectangular parcel from current width/depth.
4. Render buildable envelope from shared geometry engine.
5. Add selection model and inspector.

### Pass 3 — building manipulation
1. Add building object.
2. Drag + 1 ft snap.
3. Resize handles.
4. Duplicate/delete.
5. Live footprint/coverage.
6. Live setback and parcel conflicts.
7. Undo/redo.
8. localStorage persistence.

### Pass 4 — custom parcel drawing
1. Draw polygon vertices.
2. Close polygon.
3. Drag vertices.
4. frontage selection.
5. per-edge setback mapping.
6. fit-to-view.

### Pass 5 — access concepts
1. Garage objects.
2. garage face.
3. driveway polyline.
4. simple access checks.
5. optional explicit swept-path test.

### Pass 6 — smart suggestions
1. bounded repair API.
2. ghost suggested placement.
3. apply/reject.
4. duplicate and compare.
5. small solver-generated shortlist.

---

# Quality gates

Before public release of v2.1:

- No canvas action can mutate Workbench/Pondy source data.
- Shared geometry package is authoritative.
- Rectangular quick mode produces same or explicitly versioned assessment result as current public app.
- Custom polygons retain exact world coordinates through save/reload.
- Dragging does not accumulate pixel rounding drift.
- Buildable envelope updates deterministically after parcel/setback change.
- Coverage calculation updates from actual placed footprints.
- Undo/redo restores exact model state.
- Mobile fallback remains functional.
- App continues to state clearly that it is an early planning aid, not permit approval.

# Definition of success

A first-time user can visit LotScope, enter or draw their lot, add two conceptual building footprints, move them around for several minutes, immediately understand why placements pass or conflict, and save/compare a useful concept without needing technical site-planning knowledge.

That is the public upgrade target.
