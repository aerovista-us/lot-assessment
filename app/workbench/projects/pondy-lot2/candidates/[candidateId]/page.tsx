import { CandidateWorkspaceClient } from "@/components/workbench/CandidateWorkspaceClient";
import { mayUseEditorV2 } from "@/lib/aerovista/editor-v2-access";
import { pondyCandidateRegistry } from "@/projects/pondy-lot2/candidate-registry";

export async function generateStaticParams() {
  return pondyCandidateRegistry.candidates.map((candidate) => ({ candidateId: candidate.id }));
}

export default async function CandidateWorkspacePage({ params }: { params: Promise<{ candidateId: string }> }) {
  const { candidateId } = await params;
  const allowEditorV2 = await mayUseEditorV2();
  return <main className="shell workbench-shell candidate-workspace-shell"><CandidateWorkspaceClient candidateId={candidateId} allowEditorV2={allowEditorV2} /></main>;
}
