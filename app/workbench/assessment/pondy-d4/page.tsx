import { AssessmentResult } from "@/components/AssessmentResult";
import { pondyDesign4Evidence } from "@/projects/pondy-design4/evidence";

export const metadata = {
  title: "LotScope Workbench · Pondy Design 4 Evidence",
  description: "Private Workbench assessment with technical gate detail and evidence provenance."
};

export default function PondyDesign4WorkbenchAssessmentPage() {
  return <AssessmentResult evidence={pondyDesign4Evidence} mode="WORKBENCH" />;
}
