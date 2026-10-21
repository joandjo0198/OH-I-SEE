/** Shared concept geometry in metres. The reference shows the facade only;
 * interior zoning is illustrative, not a surveyed or certified floor plan. */
export const luxuryResidence = {
  floors: 2,
  floorHeight: 3.92,
  structureScaleY: 1.17,
  balcony: {x:1.6,z:12.5,width:10.8,depth:2.6},
  roof: {x:1.225,z:1.5,width:11.55,depth:14.2,height:6.77},
  upperWalls: [
    {a:[2,2],b:[12,2],openings:[[1,2.5,'window'],[6,2.5,'window']]},
    {a:[2,2],b:[2,13],openings:[[7,3.5,'glass']]},
    {a:[12,2],b:[12,13],openings:[[.9,3.8,'glass'],[5.5,4.7,'glass']]},
    {a:[2,13],b:[12,13],openings:[[.75,8.6,'glass']]}
  ],
  rooms: [
    ["KITCHEN", 2, 2, 4, 4],
    ["DINING", 2, 6, 4, 3],
    ["LIVING", 2, 9, 7, 4],
    ["GUEST BEDROOM", 6, 2, 6, 4],
    ["BATH", 6, 6, 2, 3],
    ["STAIR", 8, 6, 4, 3],
    ["FOYER", 9, 9, 3, 4],
    ["COVERED PARKING", 12.4, 9, 6, 6],
    ["GARDEN", 2, 14, 7, 4],
  ],
  walls: [
    {
      a: [2, 2],
      b: [12, 2],
      openings: [
        [1, 2, "window"],
        [5.6, 2.8, "window"],
      ],
    },
    {
      a: [2, 2],
      b: [2, 13],
      openings: [
        [1, 2.2, "window"],
        [7, 3, "window"],
      ],
    },
    {
      a: [12, 2],
      b: [12, 13],
      openings: [
        [1, 2, "window"],
        [6.8, 3, "window"],
      ],
    },
    {
      a: [2, 13],
      b: [12, 13],
      openings: [
        [1, 6, "glass"],
        [7.4, 1.5, "door"],
      ],
    },
    {
      a: [6, 2],
      b: [6, 9],
      openings: [
        [3.4, 1, "door"],
        [5.5, 1, "door"],
      ],
    },
    { a: [6, 6], b: [12, 6], openings: [[3.8, 1, "door"]] },
    { a: [2, 9], b: [8, 9], openings: [[2, 2, "door"]] },
    { a: [8, 6], b: [8, 9], openings: [[1.1, 0.9, "door"]] },
  ],
};
export function luxuryPlan(clean = false) {
  const c = luxuryResidence;
  const spatial = clean === "spatial";
  let paths = "", symbols = "";
  for (const w of c.walls) {
    const dx = w.b[0] - w.a[0],
      dz = w.b[1] - w.a[1],
      len = Math.hypot(dx, dz);
    let prev = 0;
    for (const o of [...w.openings, [len, 0]]) {
      const x = w.a[0] + (dx / len) * prev,
        y = w.a[1] + (dz / len) * prev,
        xx = w.a[0] + (dx / len) * o[0],
        yy = w.a[1] + (dz / len) * o[0];
      paths += `M${x} ${y}L${xx} ${yy}`;
      if(o[1]) {
        const ex = w.a[0] + dx / len * (o[0] + o[1]), ey = w.a[1] + dz / len * (o[0] + o[1]);
        if(o[2] === "door") {
          const hx = xx - dz / len * o[1], hy = yy + dx / len * o[1];
          symbols += '<path d="M'+xx+' '+yy+'L'+hx+' '+hy+'M'+hx+' '+hy+'A'+o[1]+' '+o[1]+' 0 0 0 '+ex+' '+ey+'"/>';
        } else symbols += '<path d="M'+xx+' '+yy+'L'+ex+' '+ey+'"/>';
      }
      prev = o[0] + o[1];
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="840" viewBox="0 0 21 21" role="img" aria-label="Ground-floor concept for the two-storey residence, including living, dining, kitchen, guest bedroom, stair and right-hand carport"><defs><pattern id="luxury-grid" width=".5" height=".5" patternUnits="userSpaceOnUse"><path d="M.5 0H0V.5" stroke="#7898a2" stroke-opacity=".18" fill="none" stroke-width=".018"/></pattern></defs>${clean ? "" : '<rect width="21" height="21" fill="url(#luxury-grid)"/>'}<g font-family="Arial" fill="#d5e0de">${c.rooms.map(([label, x, z, w, d]) => `<rect x="${x + 0.1}" y="${z + 0.1}" width="${w - 0.2}" height="${d - 0.2}" fill="${spatial ? "#bdac88" : clean ? "#758b86" : "none"}" fill-opacity=".24"/><text x="${x + w / 2}" y="${z + d / 2}" font-size=".27" text-anchor="middle">${label}</text>`).join("")}${spatial ? '<g fill="#7b9264"><circle cx="3" cy="16" r=".7"/><circle cx="5" cy="17" r=".8"/><circle cx="19" cy="12" r=".6"/></g>' : ""}<path d="M${c.balcony.x} ${c.balcony.z}h${c.balcony.width}v${c.balcony.depth}h-${c.balcony.width}z" stroke="#a6b8bc" stroke-width=".045" stroke-dasharray=".18 .12" fill="none"/><path d="${paths}" stroke="#d7e1da" stroke-width=".13" fill="none"/><g stroke="#afc2ba" stroke-width=".035" fill="none">${symbols}<path d="M2 1H12M2 .7V1.7M12 .7V1.7M1 2V13M.7 2H1.7M.7 13H1.7 M12.4 9h6v6h-6z M2 14h10 M2 14.3h10 M2 14.6h10 M8.3 6.3h3.4m-3.4 .3h3.4m-3.4 .3h3.4m-3.4 .3h3.4m-3.4 .3h3.4m-3.4 .3h3.4m-3.4 .3h3.4"/><rect x="14.54" y="10.575" width="1.92" height="4.25" rx=".3"/><rect x="5.55" y="10.975" width="3.5" height="1.05" rx=".1"/><rect x="6.25" y="9.61" width="1.9" height=".88" rx=".05"/><rect x="8" y="2.6" width="2.4" height="2.8"/><path d="M2.4 5.5V2.4H5.5 M17 3V1l-.3 .5m.3 -.5l.3 .5"/></g><g font-size=".25"><text x="7" y=".7" text-anchor="middle">10 000</text><text x=".6" y="7" transform="rotate(-90 .6 7)">11 000</text><text x="16.8" y=".7">N</text><text x="2" y="19">OH I SEE / G+1 RESIDENCE / CONCEPT PLAN</text><text x="2" y="19.6">FRONT BALCONY ABOVE · SAME STRUCTURAL FOOTPRINT</text></g></g></svg>`;
}

/** No-WebGL projection uses the same wall footprint as the live mesh. */
export function residenceFallback(stage) {
  if (stage < 3) return luxuryPlan(stage === 2 ? "spatial" : stage === 1);
  const project = (x,y,z) => [420+(x-10)*23-(z-10)*16,300+(x-10)*7+(z-10)*11-y*33];
  const face = (points,color) => '<polygon points="'+points.map(p=>project(...p).join(',')).join(' ')+'" fill="'+color+'" stroke="#728489" stroke-width="1"/>';
  let shapes=face([[0,0,0],[21,0,0],[21,0,21],[0,0,21]],'#344842');
  for(const y of [0,3.45]) for(const w of (y ? luxuryResidence.upperWalls : luxuryResidence.walls)) {
    let prev=0; const dx=w.b[0]-w.a[0],dz=w.b[1]-w.a[1],len=Math.hypot(dx,dz);
    for(const [at,width] of [...w.openings,[len,0]]) {
      const a=[w.a[0]+dx/len*prev,w.a[1]+dz/len*prev],b=[w.a[0]+dx/len*at,w.a[1]+dz/len*at];
      shapes+=face([[a[0],y,a[1]],[b[0],y,b[1]],[b[0],y+3.15,b[1]],[a[0],y+3.15,a[1]]],stage===4?'#c4b69c':'#b4bec1'); prev=at+width;
    }
  }
  for(const y of [3.3,6.8]) shapes+=face([[1.5,y,1.5],[12.5,y,1.5],[12.5,y,14.5],[1.5,y,14.5]],stage===4?'#d8d1c1':'#d1d6d6');
  shapes+=face([[12.4,3.1,9],[18.4,3.1,9],[18.4,3.1,15],[12.4,3.1,15]],'#7d898a');
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 840 600" role="img" aria-label="Simplified architectural projection">'+shapes+'</svg>';
}

// Facade lines derive from the same front-wall openings as the live model.
export function residenceElevation(){
 let lines='';
 for(const [walls,level] of [[luxuryResidence.walls,0],[luxuryResidence.upperWalls,3.45]]){
   const front=walls.find(w=>w.a[1]===13&&w.b[1]===13);
   for(const [at,width] of front.openings)lines+='<rect x="'+(2+at)+'" y="'+(7-level-2.9)+'" width="'+width+'" height="2.65"/>';
 }
 return '<svg viewBox="0 0 23 10" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="currentColor" stroke-width=".035"><path d="M1 7H21M2 7V.3H12V7M1.2 .3H12.8M1.6 3.65H12.4M12.4 7V3.9H18.6V7M1.6 2.5H12.4V3.5H1.6Z"/>'+lines+'<path stroke-dasharray=".1 .14" d="M.7 .3V7M.4 .3H1M.4 7H1M2 8H12M2 7.7V8.3M12 7.7V8.3"/></g><g fill="currentColor" font-family="monospace" font-size=".3"><text x="2" y="9">FRONT ELEVATION / G+1</text><text x="6" y="8.5">10 000</text></g></svg>';
}
