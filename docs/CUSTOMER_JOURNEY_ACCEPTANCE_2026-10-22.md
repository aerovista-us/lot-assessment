# Customer design journey — October 22, 2026

This describes draft PR #131, not an accepted production release. Release evidence must identify the exact served commit. The browser connection works again; the PR preview currently requires an AeroVista Account sign-in.

## Customer workflow

1. Open a candidate and select the building owner and floor.
2. Generate alternatives and inspect the room, amber hallway and pink proposed-door geometry. Scores compare planning preferences, not architectural quality or code compliance.
3. Explicitly select and save an alternative. Generating or cancelling alternatives leaves the prior saved design intact. A replacement proposal affects only the selected owner/floor; stair reservations require manual reconciliation.
4. Confirm the saved revision, room/hall/door counts and browser-local storage notice. Export `.lotscope.json` for portability across origins, browsers or devices.
5. Reload the candidate and inspect **Saved revision data**.
6. Create a report preview, inspect the attached geometry, then download the same HTML. A subsequent design change makes the preview stale and disables its download until regenerated.

Report generation has two independent provenance digests: the candidate SHA-256 and the saved DesignDocument SHA-256. The report contains escaped, exact saved shape, doorway and source records under **Saved revision and exact geometry data**. SVG coordinates retain the existing three-decimal display precision. Draft-room and upper-floor summaries must acknowledge actual attached geometry while preserving review-required status.

## Persistence and navigation

- The workspace schema and storage key are unchanged. No migration or server persistence is introduced.
- Saves require successful storage write/read-back. Unreadable, unsupported, blocked or quota-limited storage must not become an empty workspace or a success message.
- Navigation identifies the current section, includes a keyboard skip link and groups engineering tools. Responsive controls and comparison cards adapt to narrow screens.
- The authenticated Workbench navigation carries its deployment environment and source commit as DOM attributes for exact-head acceptance. No credentials are exposed.

## Automated evidence

`npm run test:design-journey` always exercises a rectangular three-alternative fixture and a turning L-shaped corridor. It verifies non-top selection, storage hydration, exact report shape/door/source records, rendered coordinate tolerance of 0.001 ft, separate design digests, authored-label escaping, replacement comparison without saved-state mutation, preservation of another floor, stair-reservation rejection and storage failure behavior.

This fixture also exposed a concave collision false positive: a polygon's vertex average can lie outside its own interior. Collision sampling now checks membership in both polygons, and mutual containment still rejects duplicate concave corridors. The older conditional report-coordinate assertions had over-escaped regular expressions; they are corrected, and the new independent fixtures ensure the fidelity gate runs regardless of checked-in candidate geometry.

Existing universal design, common solver, candidate report, workspace and intervention regression suites also remain required. Hosted CI must install the real private App Adapter package and pass TypeScript and the production build. The local container has public dependencies only; it cannot independently complete the authenticated build without that package.

`npm run test:customer-journey-ui` runs the actual React editor, workspace hook, navigation and report-preview components in a DOM test environment. It compares three alternatives, selects a non-top option, saves, mounts a fresh page with persisted data, checks the exact report document, cancels replacement comparison without mutation and blocks an outdated report download. Only navigation/download transports are test doubles. This caught and fixed an unsaved-comparison bug: recreating the empty design document on every render changed its timestamp and immediately marked generated alternatives stale. The empty document is now memoized against its real source. This test establishes component behavior, not hosted authentication or visual/mobile layout acceptance.

Local pixel-layout verification remains incomplete: the available browser could not reach the container's fixture server. No desktop/mobile screenshot acceptance is claimed for this commit.

## Outstanding hosted acceptance — issue #132

- Authenticate on the exact PR preview; confirm its served commit.
- Transfer the browser-local Design 4 package if that candidate is absent on the preview origin. Do not substitute production cookies or weaken authorization.
- Compare at least three alternatives; select a non-top option; save and reload.
- Compare exact saved DesignDocument records and report records, door references, source signature and parcel handedness.
- Capture desktop/mobile screenshots and browser logs, plus a report/export artifact and commit/revision identifiers.

Passing local fixtures is not authenticated hosted acceptance. Keep PR #131 draft until the software release checks and issue #132 evidence pass. Digital concept and digitally validated remain distinct from construction approved; physical, structural, stair, fire-separation and jurisdictional acceptance are independently disclosed and never inferred from these tests.
