/**
 * Lot 2 — Parking Reset Gate (integrated + detached).
 * Verdicts: FULL PASS | CONDITIONAL | FAIL | REVIEW
 * CONDITIONAL = viable working geometry with named open hard checks (not a premature approval).
 */
const Lot2ParkingReset = (() => {
  const L = typeof Lot2 !== 'undefined' ? Lot2 : {};
  const A = typeof Lot2Access !== 'undefined' ? Lot2Access : null;
  const Sk = typeof Lot2AccessSkeleton !== 'undefined' ? Lot2AccessSkeleton : null;
  const V = (typeof Lot2SOT !== 'undefined' && Lot2SOT.SUV_FS) || { length: 20.5, width: 8, doorWidth: 16, apronDepth: 24 };
  const ORDER = L.PARKING_RESETS || ['reset_r6_1', 'reset_r6_2', 'reset_r5', 'reset_r6_3', 'reset_r6', 'reset_r7', 'reset_r8', 'reset_r1', 'reset_r2', 'reset_r4', 'reset_r3'];
  const MIN_BAY_DEPTH = L.MIN_LIFT_BAY_DEPTH || 22;

  function gateClear(d) {
    return d.gate ? d.gate.clear : d.clear;
  }

  function gateOk(d) {
    if (d.gate) return d.gate.clear >= V.length - 0.5 && d.gate.apron >= V.length - 0.5;
    return d.clear >= V.length - 0.5 && d.ok !== false;
  }

  function bayDepthReport(concept) {
    const rows = (concept.garages || [])
      .filter((g) => !g.covered)
      .map((g) => {
        const depth = (g.doorFace === 'E' || g.doorFace === 'W') ? g.w : g.h;
        const door = (g.doorFace === 'E' || g.doorFace === 'W') ? g.h : g.w;
        return {
          id: g.id,
          name: g.name,
          depth,
          door,
          ok: depth >= MIN_BAY_DEPTH && door >= V.doorWidth - 0.5,
          needDepth: MIN_BAY_DEPTH,
          needDoor: V.doorWidth,
        };
      });
    const ok = rows.length > 0 && rows.every((r) => r.ok);
    const detail = rows.length
      ? rows.map((r) => `${r.id}: ${r.depth}′ deep × ${r.door}′ door${r.ok ? '' : ` (need ≥${r.needDepth}′ deep · ≥${r.needDoor}′ door)`}`).join(' · ')
      : 'No enclosed bays';
    return { ok, rows, detail };
  }

  function householdIndependence(concept, access) {
    const hh = concept.households || [];
    if (hh.length < 2) {
      return { ok: !!access.independent, note: access.independent ? 'Engine independent bays' : 'Fewer than two household groups' };
    }
    const paths = concept.accessPaths || [];
    const byId = {};
    paths.forEach((ap) => { byId[ap.garage] = ap.path; });
    const hasPath = hh.every((h) => h.structures.some((id) => byId[id] && byId[id].length >= 2));
    const pennOk = hh.every((h) => {
      const p = byId[h.structures.find((id) => byId[id])];
      return p && p[0] && p[0][0] >= 147;
    });
    if (concept.sharedSpine || concept.dualCurbCut) {
      const doorsOk = (access.doors || []).every((d) => (d.gate ? d.gate.clear : d.clear) >= 12);
      const ok = hasPath && pennOk && doorsOk;
      return {
        ok,
        note: ok
          ? (concept.dualCurbCut
            ? 'Two Penn curb cuts · independent door staging per household'
            : 'Shared side-access spine · independent door staging per household')
          : 'Household door approaches incomplete',
      };
    }
    const primary = hh.map((h) => {
      const id = h.structures.find((s) => {
        const g = (concept.garages || []).find((x) => x.id === s);
        return g && !g.covered;
      }) || h.structures[0];
      return byId[id];
    });
    const split =
      primary[0] && primary[1]
      && (primary[0].some((pt) => pt[1] >= 30) !== primary[1].some((pt) => pt[1] >= 30)
        || Math.abs((primary[0][primary[0].length - 1]?.[0] || 0) - (primary[1][primary[1].length - 1]?.[0] || 0)) > 20);
    const ok = hasPath && pennOk && (access.independent || split);
    return {
      ok,
      note: ok
        ? 'Two household approaches (detached split)'
        : 'Household approaches not independently demonstrated',
    };
  }

  function analyzeReset(id) {
    const concept = L.CONCEPTS[id];
    if (!concept || !concept.parkingReset) return { id, error: 'Not a parking-reset concept' };
    const geom = L.validateConcept ? L.validateConcept(concept) : { status: 'FAIL', reasons: ['No validator'] };
    const access = A ? A.analyzeConcept(id) : { technical: 'FAIL', reasons: ['No access engine'], doors: [] };
    const arch = Sk ? Sk.architectureRemaining(concept) : { plausibleHomes: false, verdict: 'Poor', summary: 'No arch engine', unitA: {}, unitB: {} };
    const doors = (access.doors || []).filter((d) => !(d.name || '').includes('COVERED'));
    const stagingOk = doors.length > 0 && doors.every(gateOk);
    const hh = householdIndependence(concept, access);
    const threePoint = !!(access.threePoint || (access.shortTangents || []).some((n) => n.kind === 'short-tangent'));
    const shortTans = (access.shortTangents || []).filter((n) => n.kind === 'short-tangent');
    const minTangent = shortTans.reduce((m, n) => Math.min(m, n.have), Infinity);
    const tangentOk = shortTans.length === 0 || (Number.isFinite(minTangent) && minTangent >= 25 - 0.5);
    const bay = bayDepthReport(concept);
    const dailyOk = access.daily && !String(access.daily).startsWith('Poor') && !String(access.daily).startsWith('N/A');
    /** FULL PASS requires Good daily (forward-exit / clean ops) — Fair stays CONDITIONAL. */
    const dailyFullOk = dailyOk && String(access.daily).startsWith('Good');
    const surveyOk = geom.status === 'PASS' || (geom.inSurvey !== false && geom.inSetback !== false && !String(geom.status || '').includes('FAIL'));
    const containOk = geom.reasons
      ? !geom.reasons.some((r) => /outside survey|outside working setback/i.test(r))
      : surveyOk;
    const plateCross = Sk && Sk.plateDriveCrossing ? Sk.plateDriveCrossing(concept) : { ok: true, detail: '—' };
    const outboundOk = access.outboundClear !== false;
    const axleOk = A && A.AXLE_TO_BODY != null
      ? Math.abs(A.AXLE_TO_BODY - ((V.length / 2) - (V.rearOverhang != null ? V.rearOverhang : 4))) < 0.05
      : true;
    const sweptHardFail = access.technical === 'FAIL'
      || (access.reasons || []).some((r) =>
        (/Inbound FS-SUV.*leaves the lot/i.test(r) || /Swept envelope clips/i.test(r) || /swept body hits/i.test(r))
        && !/^Outbound/i.test(r));
    const sweptSoftOk = access.technical === 'PASS'
      || (access.technical === 'REVIEW' && !sweptHardFail);

    const openIssues = [];
    if (!bay.ok) openIssues.push(`Bay envelope: ${bay.detail}`);
    if (!containOk) openIssues.push(`Containment: plate/garage outside survey or working setback`);
    if (!plateCross.ok) openIssues.push(plateCross.detail);
    if (!outboundOk) openIssues.push('Outbound swept path unresolved (reverse of inbound)');
    if (!axleOk) openIssues.push('Vehicle body not positioned on rear-axle path (SOT wheelbase/overhang)');
    if (!tangentOk) {
      openIssues.push(`Swept path: min tangent ${(+minTangent).toFixed(1)}′ < 25′ FS-SUV`);
    } else if (access.technical === 'REVIEW' || threePoint) {
      openIssues.push(
        threePoint
          ? 'Swept path: three-point / sharp corner burden remains'
          : 'Swept path: on-lot · 25′ fillet closed · daily / apron REVIEW (not FULL PASS)',
      );
    }
    (concept.openIssues || []).forEach((o) => {
      if (!openIssues.some((x) => x.includes(o.slice(0, 24)))) openIssues.push(o);
    });

    const notchNote = arch.zoneA || arch.zoneB
      ? [arch.zoneA, arch.zoneB].filter(Boolean).map((z) => (z.notchSf ? `−${z.notchSf} SF notch` : null)).filter(Boolean).join(' · ')
      : '';
    const checks = {
      containment: {
        ok: containOk && geom.status !== 'FAIL',
        detail: containOk
          ? (geom.status === 'PASS' ? 'Survey / setback OK (incl. reserved plates)' : `Geom ${geom.status} · plates in envelope`)
          : (geom.reasons || []).slice(0, 2).join('; ') || geom.status,
      },
      swept: {
        ok: sweptSoftOk,
        detail: access.technical === 'PASS' && tangentOk
          ? 'FS-SUV PASS · tangents ≥25′ · axle-relative body'
          : tangentOk && access.technical === 'REVIEW'
            ? 'FS-SUV REVIEW · 25′ fillet closed · daily/apron open'
            : `FS-SUV ${access.technical}${Number.isFinite(minTangent) ? ` · min tangent ${(+minTangent).toFixed(1)}′` : ''}`,
      },
      staging: {
        ok: stagingOk,
        detail: doors.map((d) => `${(d.name || '').replace(/ ·.*/, '')}: ${(d.gate && d.gate.face) || d.best} ${gateClear(d)}′`).join(' · ') || 'No doors',
      },
      independent: { ok: hh.ok, detail: hh.note },
      daily: {
        ok: dailyOk && !threePoint && tangentOk,
        detail: `${access.daily || '—'}${!tangentOk ? ' · fillet open' : threePoint ? ' · three-point open' : access.technical === 'REVIEW' ? ' · apron / reverse REVIEW' : ''}`,
      },
      bayDepth: { ok: bay.ok, detail: bay.detail },
      homeWidth: {
        ok: !!(arch.unitA && arch.unitA.ok && arch.unitB && arch.unitB.ok),
        detail: arch.summary || '—',
      },
      homeArea: {
        ok: !!arch.plausibleHomes,
        detail: arch.plausibleHomes
          ? (arch.mode === 'integrated'
            ? `Integrated plates OK (notched for drive/apron${notchNote ? ` · ${notchNote}` : ''})`
            : 'Both plates ≥600 SF contiguous (supports ~1,800 SF with upper)')
          : 'Contiguous / notched plates insufficient for two plausible homes',
      },
      plateIntegrity: {
        ok: plateCross.ok,
        detail: plateCross.detail,
      },
      outbound: {
        ok: outboundOk,
        detail: outboundOk ? 'Outbound reverse sweep clear' : 'Outbound movement unresolved',
      },
      axleModel: {
        ok: axleOk,
        detail: axleOk
          ? `Rear-axle path · body +${(A && A.AXLE_TO_BODY != null ? A.AXLE_TO_BODY : 6.25).toFixed(2)}′ ahead`
          : 'Invalid rear-axle / body offset',
      },
    };

    const hardFail = !checks.containment.ok || sweptHardFail || !checks.staging.ok;
    const plateOk = checks.homeWidth.ok && checks.homeArea.ok && checks.independent.ok;
    /** FULL PASS regressions: setback plates, no structural plate crossing, axle model, inbound+outbound, daily. */
    const fullHard = checks.swept.ok && access.technical === 'PASS' && tangentOk && checks.bayDepth.ok
      && dailyFullOk && !threePoint && plateOk && checks.containment.ok && checks.staging.ok
      && checks.plateIntegrity.ok && checks.outbound.ok && checks.axleModel.ok;

    let verdict = 'FAIL';
    if (hardFail) verdict = 'FAIL';
    else if (fullHard) verdict = 'PASS';
    else if (plateOk && checks.staging.ok && checks.containment.ok && sweptSoftOk) verdict = 'CONDITIONAL';
    else if (access.technical === 'REVIEW' && plateOk) verdict = 'CONDITIONAL';
    else if (!plateOk || !checks.independent.ok) verdict = 'FAIL';
    else verdict = 'REVIEW';

    const reasons = [];
    Object.entries(checks).forEach(([k, v]) => {
      if (!v.ok) reasons.push(`${k}: ${v.detail}`);
    });
    openIssues.forEach((o) => reasons.push(`OPEN: ${o}`));
    (access.reasons || []).slice(0, 4).forEach((r) => reasons.push(r));

    return {
      id,
      label: concept.label,
      priority: concept.priority,
      program: concept.parkingProgram,
      geomStatus: geom.status,
      physical: access.technical,
      daily: access.daily,
      architecture: arch,
      checks,
      openIssues: [...new Set(openIssues)],
      verdict,
      reasons: [...new Set(reasons)].slice(0, 16),
      access,
      relative: concept.designConcern,
      bay,
    };
  }

  function analyzeAll() {
    const rows = {};
    ORDER.forEach((id) => { rows[id] = analyzeReset(id); });
    const full = ORDER.filter((id) => rows[id].verdict === 'PASS');
    const conditional = ORDER.filter((id) => rows[id].verdict === 'CONDITIONAL');
    const integ = (L.PARKING_RESETS_INTEGRATED || []).filter((id) => rows[id]);
    let lesson = 'No reset clears the Parking Reset Gate yet. Architecture stays off.';
    if (full.length >= 1) {
      const first = full.sort((a, b) => (rows[a].priority ?? 99) - (rows[b].priority ?? 99))[0];
      lesson = `FULL PASS: ${rows[first].label}. Replaces R6.1 as public lead. Deterministic schematic architecture may begin. R6.4A/B remain secondary four-enclosed repair.`;
      if (full.length > 1) lesson += ` Also FULL PASS: ${full.filter((id) => id !== first).map((id) => rows[id].label).join(', ')}.`;
    } else if (conditional.length >= 1) {
      const leadId = rows.reset_r6_1?.verdict === 'CONDITIONAL' ? 'reset_r6_1'
        : conditional.sort((a, b) => (rows[a].priority ?? 99) - (rows[b].priority ?? 99))[0];
      const r = rows[leadId];
      const opens = (r.openIssues || []).slice(0, 2).join(' · ') || 'named hard checks still open';
      lesson = `Repair-before-close. Hierarchy: R5 active practical · R6.4A/B repair · R6.4 REPAIR — DAILY POOR · R6.1 public reference · R6.2A closed · R6.3 AHJ hold. Open: ${opens}. Architecture OFF until FULL PASS.`;
    } else {
      lesson = 'Repair-before-close active. Prefer R5 daily path or R6.4A/B fixes. Architecture OFF.';
    }
    return {
      order: ORDER,
      rows,
      table: ORDER.map((id) => {
        const r = rows[id];
        return {
          id,
          reset: r.label,
          program: r.program ? `${r.program.spacesEnclosed} enc / ${r.program.spacesTotal} tot` : '—',
          track: (L.CONCEPTS[id] || {}).parkingIntegrated ? 'integrated' : 'detached',
          physical: r.physical,
          staging: r.checks.staging.ok ? 'PASS' : 'FAIL',
          homes: r.architecture.plausibleHomes ? 'Yes' : 'No',
          bay: r.checks.bayDepth.ok ? 'OK' : 'SHORT',
          arch: r.architecture.verdict,
          daily: r.daily,
          verdict: r.verdict,
        };
      }),
      lesson,
      fullPasses: full,
      conditionalPasses: conditional,
    };
  }

  /** Regression: no FULL PASS with plate outside setback, structural plate cross, bad axle model, or unresolved in/out. */
  function assertValidationClosure(ids) {
    const list = ids || L.PARKING_RESETS_ACTIVE || ['reset_r5', 'reset_r6_4a', 'reset_r6_4b'];
    const report = [];
    list.forEach((id) => {
      const r = analyzeReset(id);
      const fails = [];
      if (r.verdict === 'PASS') {
        if (!r.checks.containment.ok) fails.push('PASS with plate outside setback');
        if (!r.checks.plateIntegrity.ok) fails.push('PASS with drive crossing structural plate');
        if (!r.checks.axleModel.ok) fails.push('PASS with invalid axle/body sweep');
        if (!r.checks.outbound.ok) fails.push('PASS with unresolved outbound');
        if (r.physical !== 'PASS') fails.push('PASS without inbound technical PASS');
      }
      report.push({ id, verdict: r.verdict, ok: fails.length === 0, fails, checks: r.checks });
    });
    return { ok: report.every((x) => x.ok), report };
  }

  return {
    analyzeReset,
    analyzeAll,
    assertValidationClosure,
    ORDER,
    bayDepthReport,
    renderArchitectureOverlay: Sk ? Sk.renderArchitectureOverlay.bind(Sk) : () => '',
  };
})();

if (typeof module !== 'undefined') module.exports = Lot2ParkingReset;
