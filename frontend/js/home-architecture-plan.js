/** Single source of geometry, in metres. Both drafting and 3D use these coordinates.
 * Replace this validated concept data with a future project-design response at this boundary.
 * This module performs no generation, certification, or network requests.
 */
export const residence = {
  width: 16,
  depth: 20,
  wallHeight: 3.25,
  rooms: [
    { name: "MASTER BEDROOM", tag: "ROOM 01", x: 2, z: 2, w: 5, d: 4.5 },
    { name: "BEDROOM", tag: "ROOM 02", x: 7, z: 2, w: 5, d: 4.5 },
    { name: "KITCHEN", x: 2, z: 6.5, w: 3.5, d: 3 },
    { name: "BATH", x: 5.5, z: 6.5, w: 1.5, d: 3 },
    { name: "POOJA", x: 7, z: 6.5, w: 2, d: 2 },
    { name: "LIVING", x: 7, z: 8.5, w: 5, d: 3.5 },
    { name: "DINING", x: 2, z: 9.5, w: 5, d: 2.5 },
    { name: "BALCONY / VERANDA", x: 7, z: 12, w: 5, d: 2 },
    { name: "PARKING", x: 2, z: 14, w: 4, d: 4 },
  ],
  // Each opening uses distance along its wall. Windows have a sill and lintel.
  walls: [
    {
      a: [2, 2],
      b: [12, 2],
      openings: [
        { at: 1, w: 2, type: "window" },
        { at: 6.4, w: 2.3, type: "window" },
      ],
    },
    {
      a: [2, 2],
      b: [2, 12],
      openings: [
        { at: 1.2, w: 2, type: "window" },
        { at: 5.1, w: 1.6, type: "window" },
        { at: 8, w: 1.1, type: "window" },
      ],
    },
    {
      a: [12, 2],
      b: [12, 12],
      openings: [
        { at: 1, w: 2, type: "window" },
        { at: 7, w: 2.4, type: "window" },
      ],
    },
    {
      a: [2, 12],
      b: [12, 12],
      openings: [
        { at: 1, w: 2.5, type: "window" },
        { at: 5.6, w: 1.2, type: "door" },
        { at: 7.4, w: 2, type: "window" },
      ],
    },
    { a: [7, 2], b: [7, 6.5], openings: [] },
    {
      a: [2, 6.5],
      b: [12, 6.5],
      openings: [
        { at: 3.6, w: 1, type: "door" },
        { at: 7.8, w: 1, type: "door" },
      ],
    },
    { a: [5.5, 6.5], b: [5.5, 9.5], openings: [] },
    { a: [7, 6.5], b: [7, 9.5], openings: [{ at: 1.8, w: 0.8, type: "door" }] },
    { a: [2, 9.5], b: [7, 9.5], openings: [{ at: 2, w: 1.1, type: "door" }] },
    { a: [9, 6.5], b: [9, 8.5], openings: [{ at: 0.9, w: 0.9, type: "door" }] },
    { a: [7, 8.5], b: [9, 8.5], openings: [] },
  ],
};
const line = (x1, y1, x2, y2, extra = "") =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${extra}/>`;
export function planSVG(clean = false, id = "plan") {
  const p = residence;
  let walls = "",
    openings = "";
  for (const wall of p.walls) {
    const [x, z] = wall.a;
    const dx = wall.b[0] - x,
      dz = wall.b[1] - z;
    const len = Math.hypot(dx, dz),
      ux = dx / len,
      uz = dz / len;
    let prev = 0;
    for (const o of [...wall.openings, { at: len, w: 0 }]) {
      walls += line(x + ux * prev, z + uz * prev, x + ux * o.at, z + uz * o.at);
      if (o.w) {
        let ax = x + ux * o.at,
          az = z + uz * o.at,
          bx = ax + ux * o.w,
          bz = az + uz * o.w;
        if (o.type === "window") {
          openings +=
            line(ax, az, bx, bz, 'stroke="#73929a" stroke-width=".06"') +
            line(
              ax - uz * 0.07,
              az + ux * 0.07,
              bx - uz * 0.07,
              bz + ux * 0.07,
              'stroke="#73929a" stroke-width=".035"',
            );
        } else {
          openings += `<path d="M ${ax} ${az} l ${-uz * o.w} ${ux * o.w} M ${ax - uz * o.w} ${az + ux * o.w} A ${o.w} ${o.w} 0 0 0 ${bx} ${bz}" fill="none" stroke="#779195" stroke-width=".035"/>`;
        }
      }
      prev = o.at + o.w;
    }
  }
  const rooms = p.rooms
    .map(
      (r, i) =>
        `<g><rect x="${r.x + 0.1}" y="${r.z + 0.1}" width="${r.w - 0.2}" height="${r.d - 0.2}" fill="${clean ? (i < 2 ? "#dedacb" : i === 8 ? "#e1e4df" : "#ecece0") : "none"}"/><text x="${r.x + r.w / 2}" y="${r.z + r.d * 0.55}" text-anchor="middle" font-size="${r.w < 2 ? 0.27 : 0.38}" fill="#29434c">${r.name}</text>${r.tag ? `<text x="${r.x + r.w / 2}" y="${r.z + r.d * 0.55 - 0.45}" text-anchor="middle" font-size=".25" fill="#7c8f90">${r.tag}</text>` : ""}<text x="${r.x + r.w / 2}" y="${r.z + r.d * 0.55 + 0.4}" text-anchor="middle" font-size=".24" fill="#799094">${r.w.toFixed(1)} × ${r.d.toFixed(1)} M</text></g>`,
    )
    .join("");
  const furniture = `<g fill="none" stroke="#8c9e99" stroke-width=".04"><rect x="2.6" y="2.5" width="2.5" height="1.8" rx=".08"/><path d="M 2.6 3.1 h2.5 M3.85 2.5v.6"/><rect x="8" y="2.5" width="2.5" height="1.8" rx=".08"/><path d="M8 3.1h2.5 M9.25 2.5v.6"/><path d="M2.4 8.8V7h2.6v.55H3v1.25Z"/><circle cx="4.2" cy="7.25" r=".13"/><circle cx="4.65" cy="7.25" r=".13"/><rect x="3" y="10" width="1.8" height=".7" rx=".1"/><path d="M3.3 9.85v-.2m1 0v.2m-1 1v.2m1 0v-.2"/><path d="M10.9 9h.7v2.6h-3v-.6h2.3Z"/><rect x="9.3" y="9.6" width="1.1" height=".6" rx=".12"/><ellipse cx="6.25" cy="7.15" rx=".3" ry=".4"/><rect x="6" y="8.7" width=".5" height=".4"/><rect x="2.8" y="14.6" width="1.9" height="3.4" rx=".3"/><path d="M3 15.4h1.5v1.8H3z M7 12.5h5 M7 13h5 M7 13.5h5"/></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 18 22" role="img" aria-labelledby="${id}-title"><title id="${id}-title">Two-bedroom concept residence, ground floor blueprint with living, dining, kitchen, pooja, bath, veranda and parking</title><defs><pattern id="${id}-grid" width=".5" height=".5" patternUnits="userSpaceOnUse"><path d="M .5 0 H0 V.5" fill="none" stroke="#799496" stroke-opacity=".14" stroke-width=".025"/></pattern></defs><rect x="-1" y="-1" width="18" height="22" fill="#f5f5ed"/>${clean ? "" : `<rect x="-1" y="-1" width="18" height="22" fill="url(#${id}-grid)"/>`}<g font-family="Arial,sans-serif"><g stroke="#8ca0a0" stroke-width=".03" fill="none"><path d="M0 0H16V20H0Z"/><path d="M.7 1H13.3M.7 12H13.3M1 1V13M13 1V13" stroke-dasharray=".12 .12"/></g>${rooms}${furniture}<g class="draft-walls" stroke="#2f4850" stroke-width=".16" fill="none" stroke-linecap="square">${walls}</g>${openings}<g stroke="#698189" stroke-width=".035" fill="none"><path d="M2 .6H12M2 .35V1.65M12 .35V1.65M2 .6l.22 -.12m-.22 .12l.22 .12M12 .6l-.22 -.12m.22 .12l-.22 .12M.65 2V12M.4 2H1.7M.4 12H1.7M.65 2l-.12 .22m.12 -.22l.12 .22M.65 12l-.12 -.22m.12 .22l.12 -.22"/><path d="M2 13h4.5M2 12.8v.4M6.5 12.8v.4"/></g><g font-size=".23" fill="#55717a" text-anchor="middle"><text x="7" y=".42">32′–10″ / 10 000</text><text x=".38" y="7" transform="rotate(-90 .38 7)">32′–10″ / 10 000</text><text x="4.25" y="12.88">15′–6″</text><text x="9.5" y="14.7">ENTRANCE ↑</text></g><g transform="translate(14.5 2)" fill="#35535b"><text y="-.4" text-anchor="middle" font-size=".35">N</text><path d="M0 0l-.27 .9L0 .67 .27 .9Z"/><path d="M0 .7v1.1" stroke="#35535b" stroke-width=".04"/></g><g stroke="#9aa9a2" stroke-width=".04" fill="none"><circle cx="14" cy="9" r=".65"/><circle cx="14" cy="9" r=".45"/><circle cx="14.3" cy="16.8" r=".85"/><path d="M13.5 19h2M13.8 18.7v.6m.4 -.6v.6m.4 -.6v.6"/></g><path d="M1 19h3" stroke="#37565d" stroke-width=".1"/><g fill="#5b7378" font-size=".2"><text x="1" y="19.5">0</text><text x="3.4" y="19.5">3 M</text><text x="6" y="19.3">GROUND FLOOR / CONCEPT STUDY</text><text x="6" y="19.75">A–01   •   1:100   •   DIMENSIONS INDICATIVE</text></g></g></svg>`;
}
// Lightweight isometric fallback derived from the very same walls (no WebGL required).
export function axonometricSVG() {
  const project = (x, y, z) => [290 + (x - z) * 15, 80 + (x + z) * 7 - y * 22];
  let polys = "";
  for (const w of residence.walls) {
    const a = project(w.a[0], 0, w.a[1]),
      b = project(w.b[0], 0, w.b[1]),
      c = project(w.b[0], 3.25, w.b[1]),
      d = project(w.a[0], 3.25, w.a[1]);
    polys += `<polygon points="${[a, b, c, d].map((v) => v.join(",")).join(" ")}" fill="#d9ded7" stroke="#61767b" stroke-width="1"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 580 390" role="img" aria-label="Axonometric architectural form of the same two-bedroom plan"><rect width="580" height="390" fill="#f5f5ed"/><path d="M290 65L545 184 290 328 35 184Z" fill="#e5e8df" stroke="#a6b5ad"/>${polys}<text x="30" y="360" font-family="Arial" font-size="11" fill="#526e72">SAME PLAN · WALLS EXTRUDED TO 3.25 M</text></svg>`;
}
