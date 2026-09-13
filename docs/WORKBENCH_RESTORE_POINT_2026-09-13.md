# LotScope Workbench — Restore Point Before Candidate Intervention Redesign

Date: 2026-09-13
Repository: `aerovista-us/lot-assessment`

## Purpose

This file records the restore points created before beginning the candidate-registry / staff-intervention redesign.

The goal is to preserve both the current local Workbench implementation state and an explicit remote baseline before new architecture work begins.

## Exact local Workbench restore point

Local branch:

`checkpoint/workbench-pre-candidate-intervention-2026-09-13`

Local annotated tag:

`workbench-pre-candidate-intervention-2026-09-13`

Exact local commit:

`4a55ba35dd4bf42e8ddf588c51335e2e674addbb`

Commit subject:

`Workbench: add internal landing and Design 4 repair lab`

This commit is the exact pre-redesign local Workbench state and includes the internal landing / Design 4 repair-lab work present in the working repository when the new candidate-intervention direction was approved.

## Remote baseline checkpoint

Remote branch:

`checkpoint/main-before-candidate-intervention-2026-09-13`

It was created from remote `main`, whose relevant baseline commit at the time was:

`95aad512817cc118b318a51f7db6fdd472857c41`

Commit subject:

`Public: add irregular lot sketcher to Custom Lot Facts (#26)`

Important: the remote baseline checkpoint represents the published main branch before this redesign. It does **not** claim to contain the local `4a55ba35...` Design 4 repair-lab commit. The exact local restore point above is the authoritative restore point for that unpublished local Workbench state.

## Planning/documentation branch

The approved architecture and implementation plan are being documented on:

`feature/workbench-candidate-intervention-plan`

This branch was intentionally created from remote main so the conceptual plan can be reviewed independently before implementation code is merged.

## Restore instructions

To inspect or restore the exact local pre-redesign state:

```bash
git switch checkpoint/workbench-pre-candidate-intervention-2026-09-13
```

or detached at the tag:

```bash
git switch --detach workbench-pre-candidate-intervention-2026-09-13
```

To create a new recovery branch from it without moving the checkpoint:

```bash
git switch -c recovery/workbench-pre-candidate-intervention checkpoint/workbench-pre-candidate-intervention-2026-09-13
```

To inspect the published remote-main baseline:

```bash
git fetch origin
git switch -c recovery/main-pre-candidate-intervention origin/checkpoint/main-before-candidate-intervention-2026-09-13
```

## Guardrail

Do not move, force-update or reuse the two checkpoint branch names for implementation work. New implementation should occur on dedicated feature branches. The checkpoints are intentionally static references for recovery and comparison.
