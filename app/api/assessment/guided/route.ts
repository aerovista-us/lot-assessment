import { NextResponse } from "next/server";
import type { LotAssessmentInput } from "@/lib/assessment";
import type { ConfidenceMap } from "@/lib/confidence";
import { guidedAssessmentEvidence } from "@/lib/evidence-adapter";
import { evidenceForAudience } from "@/packages/evidence";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { input?: LotAssessmentInput; confidence?: ConfidenceMap };
    if (!body.input || !body.confidence) {
      return NextResponse.json({ error: "input and confidence are required" }, { status: 400 });
    }
    const evidence = guidedAssessmentEvidence(body.input, body.confidence);
    return NextResponse.json(evidenceForAudience(evidence, "PUBLIC"), { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "invalid request" }, { status: 400 });
  }
}
