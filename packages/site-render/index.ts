import { PlacementCandidate, placementPolygon } from "@/packages/placement";
import { Polygon } from "@/packages/geometry";

function pts(poly: Polygon): string {
  return poly.map(([x, y]) => `${x},${y}`).join(" ");
}

function esc(value: string): string {
  return value.replace(/[&<>\"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch] || ch));
}

export function renderCandidateSvg(args: {
  parcel: Polygon;
  buildableEnvelope: Polygon;
  candidate: PlacementCandidate;
  width?: number;
  height?: number;
  title?: string;
}): string {
  const width = args.width ?? 760;
  const height = args.height ?? 360;
  const all = [...args.parcel, ...args.buildableEnvelope, ...args.candidate.placements.flatMap(placementPolygon)];
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const minX = Math.min(...xs) - 8;
  const maxX = Math.max(...xs) + 8;
  const minY = Math.min(...ys) - 8;
  const maxY = Math.max(...ys) + 8;
  const vb = `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;

  const placementSvg = args.candidate.placements.map((item) => {
    const poly = placementPolygon(item);
    const cls = item.kind === "garage" ? "garage" : item.kind === "home" ? "home" : "other";
    const cx = item.x + item.widthFt / 2;
    const cy = item.y + item.depthFt / 2;
    return `<g><polygon points="${pts(poly)}" class="${cls}"/><text x="${cx}" y="${cy}" class="label">${esc(item.id)}</text></g>`;
  }).join("");

  const drives = args.candidate.drives.map((drive) =>
    `<polyline points="${drive.points.map(([x, y]) => `${x},${y}`).join(" ")}" class="drive"/><g>${drive.points.map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="0.8" class="cp"/><text x="${x+1}" y="${y-1}" class="tiny">${i}</text>`).join("")}</g>`
  ).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${width}" height="${height}" role="img" aria-label="${esc(args.title ?? args.candidate.id)}">
  <style>
    .parcel{fill:#fff;stroke:#151515;stroke-width:.65}.buildable{fill:#eef6ee;stroke:#6d8d6d;stroke-width:.45;stroke-dasharray:2 1}
    .home{fill:#dbe8f5;stroke:#315a7d;stroke-width:.55}.garage{fill:#f6ddbd;stroke:#92601f;stroke-width:.55}.other{fill:#eee;stroke:#777;stroke-width:.45}
    .drive{fill:none;stroke:#c33;stroke-width:1.1;stroke-linecap:round;stroke-linejoin:round}.cp{fill:#c33}.label{font:3px system-ui,sans-serif;text-anchor:middle;dominant-baseline:middle}.tiny{font:2.2px system-ui,sans-serif}.penn{stroke:#1265d6;stroke-width:1.2}.street{font:3px system-ui,sans-serif;fill:#1265d6}
  </style>
  <polygon points="${pts(args.parcel)}" class="parcel"/>
  <polygon points="${pts(args.buildableEnvelope)}" class="buildable"/>
  <line x1="148" y1="0" x2="148" y2="50" class="penn"/><text x="151" y="25" class="street" transform="rotate(90 151 25)">PENNSYLVANIA · ONLY VEHICLE ACCESS</text>
  ${placementSvg}${drives}
</svg>`;
}
