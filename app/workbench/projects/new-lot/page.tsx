import Link from "next/link";
import {NewLotIntakeClient} from "@/components/workbench/NewLotIntakeClient";
export const metadata={title:"LotScope Workbench · New Lot Draft Intake"};
export default function NewLotDraftPage(){return <main className="shell workbench-shell staff-projects-shell"><section className="staff-page-head"><p className="eyebrow">WORKBENCH · NEW LOT</p><h1>Start with measured geometry, not a drawing guess.</h1><p className="lede">Draft intake only. Parcel measurements and zoning require independent verification before any automated design can claim a PASS.</p><div className="hero-actions"><Link className="secondary-button" href="/workbench/projects">Back to projects</Link></div></section><NewLotIntakeClient/></main>;}
