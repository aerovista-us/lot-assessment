import LotScopeCallbackClient from "@/components/aerovista/LotScopeCallbackClient";

export default function LotScopeCallbackPage() {
  return <main className="shell" style={{ maxWidth: 720, paddingTop: 64 }}>
    <p className="eyebrow">AEROVISTA ACCOUNT</p><h1>Returning to LotScope Workbench.</h1><LotScopeCallbackClient />
  </main>;
}
