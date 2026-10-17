# D4 cardinal algorithm review and integration

Scope: computational model intervals only. Roof publication disabled; no physical, architectural, professional or AHJ acceptance granted.

| Finding | Disposition / regression |
|---|---|
| Edge-on faces have no single depth plane, but do have a boundary front-depth envelope | Keep explicit opt-in ray-depth support for cardinal cameras only; other camera/default behavior remains conservative |
| Concave face can obscure its own edge over only part of its length | Include its own projected boundary cuts. Regression failed before correction at t=.789; after correction the x=0..4 edge partitions at t=.75 into hidden/visible portions |
| Triangle fan is not an independent oracle for concave polygons | Oracle ear-clips the polygon before 3D ray/triangle intersection, including coplanar ray clipping; reversed/cyclic vertex order is exercised |
| Suppressed and collapsed source edges were absent from the export | v2 carries all interval parameters, suppressed intervals and projected-point records with exact source endpoints |
| Consumer's old degeneracy count guard rejects correctly accounted edge-on cases | v2 accepts only with complete source-edge coverage, matching source/camera coordinates, consistent counts and explicit projected points; missing/stale/invalid proof stays withheld |
| Model verification could be mistaken for drawing acceptance | Inspector explicitly states drawing acceptance OPEN and publication disabled. Consumer release contract remains unchanged and closed |

The source's boundary/depth roots partition each noncollapsed edge; midpoint evaluations choose the sign on an already-partitioned interval rather than vote on visibility. Every original noncollapsed edge has continuous t=0..1 coverage, including suppressed portions. Every collapsed edge has a source endpoint record. Proven world-coplanar internal seams produce no outline; duplicate physical edges produce a single stroke. Unrelated ties remain unresolved. The consumer verifies source/generated evidence and does not implement an independent visibility engine.

The reviewed suite passes 3,174 independent ray comparisons. These finite oracle comparisons are regression evidence, not formal mathematical certification. Locked candidate/owner/face/valley geometry is unchanged. The D4 inspector and Pondy exporter explicitly enable the reviewed mode; it is reusable across candidates rather than a Home B-specific geometry patch.

Regeneration order: clean exact LotScope commit → interval v2 manifest → source SHA and candidate/interval hash baseline → strict adapter and standalone copies → cross-repository audit → exact-head browser screenshots. A later geometry edit or rotation requires revalidation and regeneration. Model records, staged renders and repository provenance do not prove the actual public deployment.

Remaining release gates: confirmed served revision and all views/exports; actual-phone review; measured physical sheets and professional-set tolerance; responsible professional/AHJ dispositions. Designs 3 → 2 → 1 reuse the single sheet engine after D4 acceptance.
