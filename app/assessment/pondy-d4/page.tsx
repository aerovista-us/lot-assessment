import { AssessmentResult } from "@/components/AssessmentResult";
import { pondyDesign4Evidence } from "@/projects/pondy-design4/evidence";

export const metadata = {
  title: "LotScope Assessment · Pondy Flats Design 4",
  description: "Public LotScope decision-support view derived from the same evidence used by the private Workbench."
};

export default function PondyDesign4AssessmentPage() {
  return <AssessmentResult evidence={pondyDesign4Evidence} mode="PUBLIC" />;
}
