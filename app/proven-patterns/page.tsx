import Link from "next/link";
import styles from "./patterns.module.css";

function Elevation({ rear = false }: { rear?: boolean }) {
  return (
    <svg viewBox="0 0 720 260" role="img" aria-label={rear ? "Conceptual rear garage elevation" : "Conceptual Pennsylvania Avenue duplex elevation"} className={styles.elevation}>
      <rect width="720" height="260" fill="#0b1017" />
      <path d="M0 224H720" stroke="#5d6673" strokeWidth="2" />
      {rear ? <>
        <rect x="85" y="105" width="230" height="119" rx="2" fill="#202936" stroke="#8792a1" />
        <path d="M65 107L200 48L335 107" fill="#151c26" stroke="#b4bdc9" strokeWidth="4" />
        <rect x="112" y="144" width="78" height="80" fill="#111821" stroke="#d59b43" strokeWidth="3" />
        <rect x="210" y="144" width="78" height="80" fill="#111821" stroke="#d59b43" strokeWidth="3" />
        <rect x="405" y="117" width="225" height="107" fill="#202936" stroke="#8792a1" />
        <path d="M386 119L518 66L650 119" fill="#151c26" stroke="#b4bdc9" strokeWidth="4" />
        <rect x="440" y="151" width="66" height="73" fill="#111821" stroke="#d59b43" strokeWidth="3" />
        <rect x="530" y="151" width="66" height="73" fill="#111821" stroke="#d59b43" strokeWidth="3" />
      </> : <>
        <rect x="96" y="101" width="528" height="123" rx="2" fill="#202936" stroke="#8792a1" />
        <path d="M74 104L198 46L310 102L408 55L646 104" fill="#151c26" stroke="#b4bdc9" strokeWidth="4" />
        <path d="M360 101V224" stroke="#d59b43" strokeDasharray="7 7" />
        {[132,230,434,532].map((x) => <g key={x}><rect x={x} y="127" width="54" height="48" fill="#101722" stroke="#9eabb9"/><path d={`M${x+27} 127V175M${x} 151H${x+54}`} stroke="#647181"/></g>)}
        <rect x="280" y="163" width="52" height="61" fill="#111821" stroke="#d59b43" strokeWidth="3" />
        <rect x="388" y="163" width="52" height="61" fill="#111821" stroke="#d59b43" strokeWidth="3" />
      </>}
      <text x="24" y="28" fill="#f5bd62" fontSize="13" fontWeight="800" letterSpacing="2">{rear ? "REAR / GARAGE CHARACTER STUDY" : "PENNSYLVANIA AVE CHARACTER STUDY"}</text>
      <text x="24" y="248" fill="#7e8997" fontSize="11">Concept elevation · massing/style study, not construction drawings</text>
    </svg>
  );
}

function SiteDiagram({ rearStack = false }: { rearStack?: boolean }) {
  return <svg viewBox="0 0 760 270" className={styles.site} role="img" aria-label={rearStack ? "Rear garage stack site pattern" : "Setback spine site pattern"}>
    <path d="M30 38L690 38L690 230L590 208L420 208L30 258Z" fill="#101720" stroke="#687484" strokeWidth="2" />
    <path d="M650 30V245" stroke="#f5bd62" strokeWidth="5" /><text x="662" y="142" fill="#f5bd62" fontSize="12" transform="rotate(90 662 142)">PENNSYLVANIA AVE</text>
    {rearStack ? <>
      <rect x="55" y="58" width="96" height="74" fill="#182d25" stroke="#55b987" strokeWidth="2"/><rect x="55" y="145" width="96" height="74" fill="#182d25" stroke="#55b987" strokeWidth="2"/>
      <text x="76" y="99" fill="#b7e6cf" fontSize="11">GARAGE A</text><text x="76" y="186" fill="#b7e6cf" fontSize="11">GARAGE B</text>
      <path d="M650 174H320C245 174 224 152 205 132L158 104" fill="none" stroke="#7d8794" strokeWidth="28" strokeLinecap="round"/><path d="M205 132L157 180" fill="none" stroke="#7d8794" strokeWidth="28" strokeLinecap="round"/>
      <path d="M255 62H435V142H520V62H620V160H435V118H255Z" fill="#372a1d" stroke="#d59b43" strokeWidth="2" />
      <text x="310" y="105" fill="#f4d6a3" fontSize="13">UNIT B · L</text><text x="526" y="105" fill="#f4d6a3" fontSize="13">UNIT A</text>
    </> : <>
      <rect x="370" y="60" width="220" height="94" fill="#372a1d" stroke="#d59b43" strokeWidth="2"/><rect x="72" y="60" width="190" height="116" fill="#372a1d" stroke="#d59b43" strokeWidth="2"/>
      <rect x="492" y="80" width="82" height="72" fill="#182d25" stroke="#55b987" strokeWidth="2"/><rect x="150" y="108" width="82" height="72" fill="#182d25" stroke="#55b987" strokeWidth="2"/>
      <path d="M650 185H340L260 160" fill="none" stroke="#7d8794" strokeWidth="24" strokeLinecap="round" />
      <text x="400" y="110" fill="#f4d6a3" fontSize="13">UNIT A</text><text x="92" y="103" fill="#f4d6a3" fontSize="13">UNIT B</text>
    </>}
  </svg>;
}

export default function ProvenPatterns() {
  return <main className={styles.shell}>
    <header className={styles.top}><Link href="/">← LotScope assessment</Link><span>PROVEN PATTERNS · WORKBENCH → PUBLIC</span></header>
    <section className={styles.hero}><p>LOTSCOPE PUBLIC · VALIDATED EXAMPLES</p><h1>What a solver-proven site concept looks like.</h1><p>These are not permit plans. They are examples that have crossed LotScope&apos;s physical, program, capacity-reserve and vehicle-clearance gates in the shared Workbench engine.</p></section>
    <section className={styles.proof}><strong>Latest benchmark: PASS</strong><span>110 candidates evaluated · 58 physical passes · 55 combined passes · 9 promotion-ready candidates · 2 materially distinct promotion-ready concepts.</span></section>
    <section className={styles.grid}>
      <article className={styles.card}><div className={styles.cardhead}><div><span>DESIGN #1</span><h2>Setback Spine</h2></div><b>PROVEN</b></div><SiteDiagram/><p>Our control concept: front/rear residential masses with a long edge-access spine. Strong circulation margin and the current benchmark leader.</p><div className={styles.metrics}><span>FS-SUV clearance<strong>2.24 ft</strong></span><span>Unit A capacity<strong>2,050 sf</strong></span><span>Unit B capacity<strong>2,000 sf</strong></span></div></article>
      <article className={`${styles.card} ${styles.focus}`}><div className={styles.cardhead}><div><span>DESIGN #2</span><h2>Accessory Rear Garage Stack</h2></div><b>PROMOTION READY</b></div><SiteDiagram rearStack/><p>A connected L-shaped duplex keeps the principal building forward while two detached 20×20 garages use the accessory rear envelope. Access remains entirely from Pennsylvania.</p><div className={styles.metrics}><span>FS-SUV clearance<strong>1.50 ft</strong></span><span>Garage buffer<strong>6 ft south</strong></span><span>Garage size<strong>20×20 each</strong></span></div></article>
    </section>
    <section className={styles.elevations}><div><h2>Design #2 · street character</h2><p>The elevation studies deliberately stay conceptual. The solver proves site geometry; architecture can now develop without pretending these are permit drawings.</p></div><Elevation/><Elevation rear/></section>
    <section className={styles.explain}><h2>Why Design #2 matters</h2><div><p><strong>Different topology.</strong> This is not another coordinate variation of Design #1. Parking is pulled to a detached rear stack and the duplex becomes a connected L-shaped residential mass.</p><p><strong>Real vehicle test.</strong> The Workbench checks a 20.5 ft × 8 ft full-size SUV/pickup with a 25 ft minimum rear-axle turning radius rather than treating a centerline as proof of access.</p><p><strong>Separate envelopes.</strong> Residential mass remains in the principal-building envelope. The reduced rear/side assumption applies only to detached accessory garages and still requires local-code verification.</p></div></section>
    <footer>LotScope · Proven capability first · Planning aid, not permit approval.</footer>
  </main>;
}
