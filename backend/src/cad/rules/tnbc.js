'use strict';
// Editable design criteria supplied in the project brief. These are NOT a
// statutory approval/certification: local amendments and site rules need review.
module.exports = Object.freeze({
  version: 'brief-2026-10-24', status: 'Design criteria — professional review required',
  references: ['IS 962', 'NBC 2016 Part 3', 'TNCDBR 2019 (check applicable amendments)'],
  wall: { external: 230, internal: 115 },
  setbackDefaultsFt: { front: 6.5, rear: 3.5, left: 3.5, right: 3.5 },
  corridor: { minimum: 1050, preferred: 1200 }, clearHeight: 2750, floorHeight: 3000,
  minima: {
    habitable: { area: 9500000, width: 2400 }, kitchen: { area: 4500000, width: 1800 },
    bathroom: { area: 2800000, width: 1000 }, bath: { area: 1800000, width: 1000 },
    wc: { area: 1100000, width: 900 }, pooja: { area: 1200000, width: 900 },
    circulation: { area: 0, width: 1050 }, other: { area: 1200000, width: 1000 },
  },
  opening: { main: 1070, door: 900, toilet: 750, height: 2100, sill: 900, lintel: 2100, ventilationWidth: 600, ventilationHeight: 450, glazingRatio: 0.1, jamb: 200 },
  stair: { maxRiser: 190, minTread: 250, width: 1070, headroom: 2200 },
  parking: { carWidth: 2500, carDepth: 5000, bikeWidth: 1000, bikeDepth: 2000 },
  layers: {
    'A-PLOT': [7, 35], 'A-SETBACK': [1, 25, 'DASHED'], 'A-WALL-EXT': [5, 70], 'A-WALL-INT': [5, 50],
    'A-COLS': [4, 70], 'A-DOOR': [3, 25], 'A-WIND': [4, 25], 'A-STAIR': [6, 25],
    'A-FURN': [8, 13], 'A-FIXT': [8, 18], 'A-DIMS': [2, 18], 'A-ANNO-TEXT': [7, 18],
    'A-ANNO-TTLB': [7, 35], 'A-ANNO-NPLT': [7, 25], 'A-ROAD': [7, 25], 'A-GRID': [1, 18, 'CENTER'], 'A-HATCH': [5, 18],
  },
});
