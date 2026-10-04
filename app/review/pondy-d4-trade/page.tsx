"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "./trade-review.module.css";

type ReviewState = {
  reviewer: string;
  roleContext: string;
  responses: Record<string, string>;
  tags: Record<string, string[]>;
  hvac: Record<string, string>;
  overall: string;
  topThree: string;
  updatedAt: string | null;
};

const STORAGE_KEY = "lotscope:pondy-d4:trade-review:v1";

const QUESTIONS = [
  {
    id: "first-read",
    n: "01",
    title: "First read",
    prompt: "Looking at the plans, elevations, site information and overall package: what feels clear enough to move forward with, and what immediately makes you want to ask a question?"
  },
  {
    id: "coordination",
    n: "02",
    title: "Coordination readiness",
    prompt: "If you were helping coordinate this project, what information would you expect to have before confidently coordinating contractors or trades? What are we missing?"
  },
  {
    id: "hvac-pricing",
    n: "03",
    title: "Before HVAC pricing",
    prompt: "If an HVAC contractor were asked for an early estimate from what we currently show, what could they reasonably work with and what important information would they still need?"
  },
  {
    id: "phone-call",
    n: "04",
    title: "The phone-call test",
    prompt: "What in this package would make you stop and call the GC, designer, owner, engineer or another trade before moving forward?"
  },
  {
    id: "false-certainty",
    n: "05",
    title: "Looks decided — but is not",
    prompt: "Do any parts of the package look more settled than they really are? Where might a contractor assume a decision has already been made when another decision or confirmation is still needed?"
  },
  {
    id: "signal-noise",
    n: "06",
    title: "What contractors actually care about",
    prompt: "Are we spending space on information that is less useful while burying or omitting things a contractor or PM would care about more? What would you move up, move down, add or remove?"
  },
  {
    id: "known-unknown",
    n: "07",
    title: "Known / unknown / verify",
    prompt: "Would a clear Known / Assumed / Not Decided / Field Verify / Professional or Trade Input section help? What kinds of items belong under those headings?"
  },
  {
    id: "one-page",
    n: "08",
    title: "The one-page handoff",
    prompt: "If a contractor or PM received one summary page before opening the rest of the project, what information should be on that page?"
  }
] as const;

const HVAC_PROMPTS = [
  ["building", "Building information", "What building information matters at this stage: floor area, ceiling conditions, conditioned/unconditioned spaces, garage relationship, attic/crawl/slab conditions, envelope assumptions, glazing or orientation? What does not matter yet?"],
  ["equipment", "Equipment location", "Could you tell where equipment could reasonably go? What should LotScope show or flag about mechanical rooms, condensers, service access, attic/crawl possibilities, garage restrictions or utilities?"],
  ["distribution", "Distribution / routing", "What conditions should be highlighted because they may make duct or system distribution easier or harder: floor relationships, beams, stairs, vaulted areas, chases, garage separation or competing trade space?"],
  ["roof", "Roof + penetrations", "What roof information actually matters to HVAC? What should be visible or flagged for venting, exhaust, penetrations, clearance, routing, snow/weather or conflicts with other penetrations?"],
  ["trade-coordination", "Trade coordination", "Where does HVAC usually depend on electrical, plumbing, framing, roofing, structural, insulation, excavation or other information? What tends to arrive too late?"],
  ["handoff", "Pricing / schedule / handoff", "What information would help someone estimate, schedule or hand this project to another PM, superintendent, estimator or trade without another round of hunting through plans, emails and phone calls?"]
] as const;

const TAGS = [
  ["more-info", "Not enough information"],
  ["trade-input", "Needs trade / professional input"],
  ["field-verify", "Field verification"],
  ["useful", "Useful as shown"],
  ["priority", "High priority"]
] as const;

const REFERENCES = [
  ["Design 4 report", "https://aerovista-us.github.io/PondyFlats/design-4.html"],
  ["Site", "https://aerovista-us.github.io/PondyFlats/d4-site.html"],
  ["Plans", "https://aerovista-us.github.io/PondyFlats/d4-plans.html"],
  ["Elevations", "https://aerovista-us.github.io/PondyFlats/d4-elevs.html"],
  ["Axon", "https://aerovista-us.github.io/PondyFlats/d4-axon.html"],
  ["Sections", "https://aerovista-us.github.io/PondyFlats/d4-sections.html"],
  ["LotScope evidence", "/assessment/pondy-d4"]
] as const;

const emptyState: ReviewState = {
  reviewer: "Aleah",
  roleContext: "",
  responses: {},
  tags: {},
  hvac: {},
  overall: "",
  topThree: "",
  updatedAt: null
};

function slug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "reviewer";
}

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function PondyTradeReviewPage() {
  const [review, setReview] = useState<ReviewState>(emptyState);
  const [loaded, setLoaded] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<ReviewState>;
        setReview({
          ...emptyState,
          ...parsed,
          responses: parsed.responses ?? {},
          tags: parsed.tags ?? {},
          hvac: parsed.hvac ?? {}
        });
      }
    } catch {
      // A corrupt local draft should never block the review page.
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const next = { ...review, updatedAt: new Date().toISOString() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, [loaded, review.reviewer, review.roleContext, review.responses, review.tags, review.hvac, review.overall, review.topThree]);

  const completed = useMemo(
    () => QUESTIONS.filter((q) => (review.responses[q.id] ?? "").trim().length > 0).length,
    [review.responses]
  );

  const setResponse = (id: string, value: string) => {
    setReview((current) => ({ ...current, responses: { ...current.responses, [id]: value } }));
  };

  const toggleTag = (questionId: string, tag: string) => {
    setReview((current) => {
      const active = current.tags[questionId] ?? [];
      const next = active.includes(tag) ? active.filter((item) => item !== tag) : [...active, tag];
      return { ...current, tags: { ...current.tags, [questionId]: next } };
    });
  };

  const setHvac = (id: string, value: string) => {
    setReview((current) => ({ ...current, hvac: { ...current.hvac, [id]: value } }));
  };

  const artifact = () => ({
    schemaVersion: "lotscope-trade-review-v1",
    reviewId: `pondy-d4-${slug(review.reviewer)}-${new Date().toISOString().slice(0, 10)}`,
    project: {
      name: "Pondy Flats · Lot 2",
      design: "Design 4",
      pondySourceRevision: "16c04f33053b8dd47ce5feddf8dba14445be007f",
      lotScopeSourceRevision: "a1d4e6fd2541e65a1fc5693a9c62dcb45b069050",
      references: Object.fromEntries(REFERENCES)
    },
    reviewer: {
      name: review.reviewer.trim() || "Reviewer",
      context: review.roleContext.trim() || null
    },
    primaryReview: QUESTIONS.map((question) => ({
      id: question.id,
      title: question.title,
      response: (review.responses[question.id] ?? "").trim() || null,
      flags: review.tags[question.id] ?? []
    })),
    hvacLens: HVAC_PROMPTS.map(([id, title]) => ({
      id,
      title,
      response: (review.hvac[id] ?? "").trim() || null
    })),
    summary: {
      topThree: review.topThree.trim() || null,
      overall: review.overall.trim() || null
    },
    exportedAt: new Date().toISOString()
  });

  const exportJson = () => {
    const data = artifact();
    download(`${data.reviewId}.json`, JSON.stringify(data, null, 2), "application/json");
  };

  const exportMarkdown = () => {
    const data = artifact();
    const lines = [
      "# Pondy Flats Design 4 — Contractor / HVAC Review",
      "",
      `**Reviewer:** ${data.reviewer.name}`,
      data.reviewer.context ? `**Context:** ${data.reviewer.context}` : "",
      `**Exported:** ${new Date(data.exportedAt).toLocaleString()}`,
      "",
      "## Primary review",
      ""
    ].filter(Boolean);

    for (const question of data.primaryReview) {
      lines.push(`### ${question.title}`, "");
      if (question.flags.length) lines.push(`Flags: ${question.flags.join(", ")}`, "");
      lines.push(question.response || "_No response recorded._", "");
    }

    lines.push("## Optional HVAC / trade lens", "");
    for (const item of data.hvacLens) {
      if (!item.response) continue;
      lines.push(`### ${item.title}`, "", item.response, "");
    }

    lines.push("## Top three things to fix or add", "", data.summary.topThree || "_No response recorded._", "");
    lines.push("## Overall notes", "", data.summary.overall || "_No response recorded._", "");
    lines.push("## Source references", "");
    for (const [label, href] of REFERENCES) {
      const resolved = href.startsWith("/") ? `https://lotscope.aerovista.us${href}` : href;
      lines.push(`- ${label}: ${resolved}`);
    }
    download(`${data.reviewId}.md`, lines.join("\n"), "text/markdown");
  };

  const saveNow = () => {
    const next = { ...review, updatedAt: new Date().toISOString() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setReview(next);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1600);
  };

  const clearDraft = () => {
    if (!window.confirm("Clear this review draft from this browser? Export it first if you want to keep a copy.")) return;
    window.localStorage.removeItem(STORAGE_KEY);
    setReview(emptyState);
  };

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <div>
          <Link className={styles.brand} href="/">LotScope</Link>
          <span>FIELD REVIEW · PONDY FLATS</span>
        </div>
        <div className={styles.saveState} aria-live="polite">
          <span className={loaded ? styles.dotLive : styles.dot} />
          {savedFlash ? "Saved" : loaded ? "Draft saves on this PC" : "Loading draft…"}
        </div>
      </header>

      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>WE COULD USE YOUR HELP</p>
          <h1>What would a contractor or HVAC team need that we are not showing yet?</h1>
          <p className={styles.lede}>
            We have gotten fairly deep into Pondy Flats Design 4 — site layout, geometry, plans, elevations,
            access and the customer report. The contractor / trade-information layer is still being defined.
            We would rather build that from real project experience than guess at it from the software side.
          </p>
        </div>
        <aside className={styles.notTest}>
          <strong>This is a review, not a test.</strong>
          <p>
            “There isn’t enough information here,” “I would ask someone else,” “that belongs to another trade,”
            “I don’t know from what is shown,” and “this does not matter yet” are all useful answers.
            Those responses tell us what LotScope should know, what it should ask, and where it should stop.
          </p>
        </aside>
      </section>

      <section className={styles.identityRow}>
        <label>
          <span>Reviewer</span>
          <input value={review.reviewer} onChange={(event) => setReview((current) => ({ ...current, reviewer: event.target.value }))} />
        </label>
        <label>
          <span>Perspective / context <small>optional</small></span>
          <input
            value={review.roleContext}
            onChange={(event) => setReview((current) => ({ ...current, roleContext: event.target.value }))}
            placeholder="Example: HVAC PM, new construction, field coordination"
          />
        </label>
      </section>

      <div className={styles.layout}>
        <aside className={styles.referenceRail}>
          <section className={styles.panel}>
            <p className={styles.eyebrow}>PROJECT REFERENCES</p>
            <h2>Keep these open while you review.</h2>
            <div className={styles.links}>
              {REFERENCES.map(([label, href], index) =>
                href.startsWith("/") ? (
                  <Link key={label} href={href} target="_blank">{label}<span>↗</span></Link>
                ) : (
                  <a key={label} href={href} target="_blank" rel="noreferrer" className={index === 0 ? styles.primaryLink : ""}>{label}<span>↗</span></a>
                )
              )}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.progressHead}>
              <div><p className={styles.eyebrow}>CORE REVIEW</p><strong>{completed} / {QUESTIONS.length}</strong></div>
              <span>{Math.round((completed / QUESTIONS.length) * 100)}%</span>
            </div>
            <div className={styles.progress}><span style={{ width: `${(completed / QUESTIONS.length) * 100}%` }} /></div>
            <p className={styles.muted}>You do not need to answer every question. Five strong observations can be more useful than eight forced answers.</p>
          </section>

          <section className={styles.boundary}>
            <strong>Current accuracy boundary</strong>
            <p>
              Design 4 deliberately withholds unverified roof ridge, pitch and eave geometry until the shared
              Workbench roof model is locked. Missing information may be intentional — flag whether that absence
              is appropriate or whether a contractor still needs something at this stage.
            </p>
          </section>
        </aside>

        <div className={styles.reviewColumn}>
          <section className={styles.sectionHead}>
            <p className={styles.eyebrow}>START HERE</p>
            <h2>Eight questions that can shape the contractor / trade layer.</h2>
            <p>Answer naturally. Notes, fragments and questions are fine.</p>
          </section>

          <div className={styles.questions}>
            {QUESTIONS.map((question) => {
              const activeTags = review.tags[question.id] ?? [];
              return (
                <article className={styles.question} key={question.id}>
                  <div className={styles.questionTitle}>
                    <span>{question.n}</span>
                    <div><h3>{question.title}</h3><p>{question.prompt}</p></div>
                  </div>
                  <textarea
                    value={review.responses[question.id] ?? ""}
                    onChange={(event) => setResponse(question.id, event.target.value)}
                    placeholder="What do you notice?"
                    rows={5}
                  />
                  <div className={styles.tags} aria-label={`${question.title} review flags`}>
                    {TAGS.map(([id, label]) => (
                      <button
                        type="button"
                        key={id}
                        className={activeTags.includes(id) ? styles.tagActive : styles.tag}
                        onClick={() => toggleTag(question.id, id)}
                        aria-pressed={activeTags.includes(id)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>

          <details className={styles.optional}>
            <summary>
              <div><p className={styles.eyebrow}>OPTIONAL DEEPER PASS</p><h2>HVAC / trade lens</h2></div>
              <span>Open prompts</span>
            </summary>
            <div className={styles.optionalIntro}>
              <p>
                These are prompts, not required answers. We are not asking for HVAC engineering. We are trying
                to learn what information should exist before a contractor or PM can estimate, coordinate or
                identify the next question.
              </p>
            </div>
            <div className={styles.hvacGrid}>
              {HVAC_PROMPTS.map(([id, title, prompt]) => (
                <label className={styles.hvacCard} key={id}>
                  <span>{title}</span>
                  <small>{prompt}</small>
                  <textarea
                    value={review.hvac[id] ?? ""}
                    onChange={(event) => setHvac(id, event.target.value)}
                    rows={4}
                    placeholder="Optional notes…"
                  />
                </label>
              ))}
            </div>
          </details>

          <section className={styles.summary}>
            <p className={styles.eyebrow}>IF YOU ONLY TELL US THREE THINGS</p>
            <h2>What should we fix or add first?</h2>
            <textarea
              value={review.topThree}
              onChange={(event) => setReview((current) => ({ ...current, topThree: event.target.value }))}
              rows={5}
              placeholder={"1. …\n2. …\n3. …"}
            />
            <label>
              <span>Anything else we should know?</span>
              <textarea
                value={review.overall}
                onChange={(event) => setReview((current) => ({ ...current, overall: event.target.value }))}
                rows={5}
                placeholder="Questions, concerns, things that feel unnecessary, or ideas we did not ask about…"
              />
            </label>
          </section>

          <section className={styles.actions}>
            <div>
              <strong>Turn the review into a LotScope artifact.</strong>
              <p>Draft answers remain in this browser. Export when you want to hand the review back to the team.</p>
            </div>
            <div className={styles.actionButtons}>
              <button type="button" className={styles.secondary} onClick={saveNow}>Save draft</button>
              <button type="button" className={styles.secondary} onClick={exportMarkdown}>Export Markdown</button>
              <button type="button" className={styles.primary} onClick={exportJson}>Export LotScope JSON</button>
              <button type="button" className={styles.clear} onClick={clearDraft}>Clear draft</button>
            </div>
          </section>

          <footer className={styles.footer}>
            AeroVista · LotScope field review · domain judgment informs the product; machine evidence still owns geometry PASS.
          </footer>
        </div>
      </div>
    </main>
  );
}
