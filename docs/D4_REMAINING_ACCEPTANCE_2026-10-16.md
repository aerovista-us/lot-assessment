# D4 remaining acceptance — candidate work, no roof release

Roof publication remains disabled. `customerPublicationAllowed=false`, `approvedCandidateSignature=null`, and `approvedForConstruction=false` remain the release boundary. CI, source locks and model-verified axons do not grant drawing, print, professional or AHJ acceptance.

## Cardinal candidate

The current production verifier intentionally returns REVIEW_REQUIRED for Home B's four cardinal cameras. A rank-one projected face has no single screen-to-depth plane; that does not necessarily mean its front depth along a cardinal viewing ray is unknowable.

`verifyRoofEdgeIntervals(roof, view, {resolveCardinalEdgeOn:true})` is an **opt-in candidate only**. No production caller or export enables it. The candidate derives the affine boundary-depth envelope of an edge-on face, partitions source edges at depth crossings, proves internal seams in world coordinates, and explicitly records collapsed source edges as projected points. Unrelated depth ties remain unresolved; malformed/stale handoffs remain withheld. Camera-specific interval verification still grants no drafting approval.

`scripts/test-cardinal-ray-depth.mjs` compares emitted visible/hidden intervals against an independent 3D ray/triangle intersection oracle, including coplanar ray clipping. Current local result: 2,667 comparisons across four owners, four cardinal cameras, reversed face order, 30/90/131-degree rotations with translation, partial occlusion and edge-on fixtures. Coverage checks account for every source edge; invalid, stale and unrelated overlapping faces stay closed. Existing roof regressions also pass. Default output matched the original verifier exactly in 24 owner/camera comparisons; the hosted Workbench typecheck and production build passed on the initial candidate head. Final-head checks remain required after revisions. These finite oracle probes supplement the analytic partition proof; they are not a general mathematical certification.

Before enabling this mode: review the algorithm and exact-head CI; agree how projected-point records and seam suppression appear in consumers; regenerate source camera intervals and Pondy exports; then visually inspect every cardinal camera, axon and both real V1/V2 cuts on the actual served revision. Until then retain the current REVIEW_REQUIRED display. Any geometry change or rotation invalidates the old evidence and requires regeneration and revalidation.

## Touch regression and device gate

The inspector controls now have a minimum 44px height and the phone edge selector uses a full row with 16px text. The isolated browser test uses the actual React inspector, source-derived owners and production CSS at 390px and 768px with touch emulation, plus 1440px desktop. It exercises camera/owner/valley selection, edge change handling, overflow, target sizes, scrolling without accidental camera activation and pinch zoom. It creates screenshots and JSON evidence, including browser/Node versions and tracked-file cleanliness. Development execution on the restored NXCore passed all three viewport cases, including multi-touch pinch and scrolling without activation. The new CI checks the exact PR head and rejects dirty tracked source. Final hosted artifacts must be reviewed independently of that development run.

This fixture has no authentication route and changes no production authentication. Emulation does **not** complete actual phone/tablet or served-deployment acceptance. A legitimate reviewer must still check the served SHA on iOS Safari and/or Android Chrome as applicable: native select picker, tap/scroll/pinch, portrait/landscape, unresolved overlays and source labels, V1/V2 readability, and standalone exports. Record device, OS/browser, source and deployment SHA, screenshots, findings and reviewer decision. Recheck after relevant CSS or rendering changes.

## External evidence required

| Gate | Prepared input | Evidence still needed to close |
|---|---|---|
| Physical print | [Calibration procedure](https://github.com/aerovista-us/PondyFlats/blob/main/docs/D4_PHYSICAL_PRINT_CALIBRATION.md), existing A-001/A-101 proof SVGs | Actual-size 36×24 prints; both axes and frame readings; ruler photos; crop/linework/text assessment; printer/settings; exact file hashes; professional-set tolerance and decision |
| Architectural drawing | Locked roof faces, owner binding, camera intervals, Home B valley sections and sheet engine | Named responsible professional's revision-specific drawing review and disposition of every remaining ambiguous/withheld item |
| Survey/site and civil | Source dimension gates distinguish actual 50-ft frontage from overall 57.01-ft Y extent | Survey/frontage/setback and grading/drainage decisions by the responsible reviewers; no software inference substitutes for them |
| Structural/detailing | Source pitch, ridge/plate data, valley intersections | Responsible professional's load/snow, bearing/junction, flashing and drainage detail review; resolve withheld fascia authorization |
| AHJ | Versioned professional submission package once ready | Identify the actual reviewing authority and required submission path; retain its written acceptance/conditions and resolve those conditions. No application, contact or acceptance has been fabricated |

Physical measurement and professional/AHJ decisions require the operator and authorized reviewers. Software work can prepare the package and track findings; it cannot supply their observations or approval.

## Dependency order and closure record

1. The status-only correction in Pondy #55 is separate from roof acceptance. Its merge conveys no roof approval.
2. Freeze and bind candidate hash → exact owner keys → locked faces → camera intervals → Pondy source → standalone exports. Retain the source-chain audit output and file digests.
3. Review/promote the cardinal algorithm only after its own checks; regenerate the complete evidence chain if enabled. Review Home B N/S/E/W, axon and V1/V2 on the exact served SHA; unresolved intervals remain review/withheld.
4. Confirm actual Pages/Vercel deployment SHA, then inspect desktop, tablet, phone and standalone exports. Repository-only evidence is insufficient.
5. Obtain physical print readings, dimension/legibility disposition and the professional/AHJ decisions needed for the intended promotion. Keep approval fields closed until the applicable gates have evidence.
6. Reuse the single shared sheet engine for Designs 3 → 2 → 1 after D4 acceptance. No per-design engine fork is proposed.

For each acceptance, record source/deployment SHA, candidate/owner/face/interval/export hashes, review scope, reviewer/operator identity and date, artifact references, findings, disposition and any conditions. A later geometry/rotation edit requires a new bound record.

Related: [LotScope #86](https://github.com/aerovista-us/lot-assessment/issues/86), [Pondy #48](https://github.com/aerovista-us/PondyFlats/issues/48), [Pondy #53](https://github.com/aerovista-us/PondyFlats/issues/53), [release evidence](https://github.com/aerovista-us/PondyFlats/blob/main/docs/D4_RELEASE_EVIDENCE_2026-10-16.md).
