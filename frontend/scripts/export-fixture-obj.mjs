import {mkdir,writeFile} from 'node:fs/promises';
import {OBJExporter} from 'three/examples/jsm/exporters/OBJExporter.js';
import {fixtureGroup,disposeGroup} from '../js/floorplan/interior/fixtures3d.mjs';
import {byId} from '../js/floorplan/interior/catalog.js';
const ids=['sofa','coffee-table','tv-unit','armchair','plant-large','rug','dining-chair','bench','stool','ceiling-fan','wall-fan','ceiling-light','pendant','chandelier','floor-lamp','table-lamp'];
const dest=new URL('../public/models/fixtures/',import.meta.url);await mkdir(dest,{recursive:true});
for(const id of ids){const d=byId[id],g=fixtureGroup({fixtures:[{id,catalogId:id,roomId:'asset',position:{x:0,y:0,z:0},rotation:0,scale:1,mount:d.mountType,props:{}}]});g.updateMatrixWorld(true);await writeFile(new URL(id+'.obj',dest),'# OH I SEE procedural fixture. Units: metres.\n'+new OBJExporter().parse(g));disposeGroup(g);}
await writeFile(new URL('README.txt',dest),'Original OH I SEE procedural geometry. OBJ files use metres and contain static geometry. The studio uses the same procedural source with materials, working lights and animated fan blades. Regenerate using node frontend/scripts/export-fixture-obj.mjs.');
console.log('Exported '+ids.length+' OBJ assets');
