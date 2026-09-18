import { CandidateWorkspaceClient } from "@/components/workbench/CandidateWorkspaceClient";
import { pondyCandidateRegistry } from "@/projects/pondy-lot2/candidate-registry";

export async function generateStaticParams() {
  return pondyCandidateRegistry.candidates.map((candidate) => ({ candidateId: candidate.id }));
}

export default async function CandidateWorkspacePage({ params }: { params: Promise<{ candidateId: string }> }) {
  const { candidateId } = await params;
  return <main className="shell workbench-shell candidate-workspace-shell"><CandidateWorkspaceClient candidateId={candidateId} /></main>;
}
