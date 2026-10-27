import {compoundSegments} from './compound.mjs';
import {roofEstimate} from './roofs.mjs';
import {fixtureSVG} from './interior/fixture-model.mjs';
import {byId} from './interior/catalog.js';
export const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function feet(value){const inches=Math.round(value*12);return `${Math.floor(inches/12)}′${inches%12?inches%12+'″':''}`;}
export function planSVG(p,{selected=null,image=null,overlay=false,editable=false}={}) {
 const {width,depth,facing,roadSide}=p.plot, wallColor='#2022ad';
 const legend=[...new Set((p.fixtures||[]).map(f=>f.catalogId))].map(id=>byId[id]).filter(Boolean),extra=legend.length?Math.ceil(legend.length/2)*.9+1:0;
 const rotation=({North:180,South:0,East:-90,West:90}[facing]??0);
 const pageWidth=width+8,pageHeight=depth+12+extra,cx=width/2,cy=(depth+2+extra)/2;
 const turned=Math.abs(rotation)===90,vw=turned?pageHeight:pageWidth,vh=turned?pageWidth:pageHeight;
 const line=(x1,y1,x2,y2,color='#89929a',w=.05,extra='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${w}" ${extra}/>`;
 const text=(x,y,value,size=.6,extra='')=>`<g transform="rotate(${-rotation} ${x} ${y})"><text x="${x}" y="${y}" font-size="${size}" text-anchor="middle" fill="#152739" ${extra}>${esc(value)}</text></g>`;
 const dimension=(x1,y1,x2,y2,label)=>line(x1,y1,x2,y2)+line(x1-.2,y1-.2,x1+.2,y1+.2)+line(x2-.2,y2-.2,x2+.2,y2+.2)+text((x1+x2)/2,(y1+y2)/2-.3,label,.65);
 let s=`<svg id="plan-svg" xmlns="http://www.w3.org/2000/svg" viewBox="${cx-vw/2} ${cy-vh/2} ${vw} ${vh}" role="img" aria-label="Editable ${esc(p.title)}" style="font-family:Arial,sans-serif;background:#fff;touch-action:none"><rect x="-4" y="-5" width="${width+8}" height="${depth+12+extra}" fill="white"/><g data-plan-geometry="true" transform="rotate(${rotation} ${cx} ${cy})">`;
 s+=dimension(0,-1.3,width,-1.3,`${feet(width)} / ${(width*.3048).toFixed(2)} m`)+text(-2.2,depth/2,`${feet(depth)} / ${(depth*.3048).toFixed(2)} m`,.65,`transform="rotate(-90 -2.2 ${depth/2})"`);
 s+=`<rect x="0" y="0" width="${width}" height="${depth}" fill="#f7faf6" stroke="#adb7b2" stroke-width=".13"/>`;
 if(image&&overlay)s+=`<image href="${esc(image)}" x="0" y="0" width="${width}" height="${depth}" preserveAspectRatio="none" opacity=".55"/>`;
 const b=p.plot.setbacks;s+=`<rect x="${b.left}" y="${b.rear}" width="${width-b.left-b.right}" height="${depth-b.front-b.rear}" fill="none" stroke="#9eae9c" stroke-width=".08" stroke-dasharray=".3 .2"/>`;
 for(const r of p.rooms){s+=`<g data-room="${esc(r.id)}" style="cursor:move"><rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.depth}" fill="${r.id===selected?'#ffec9c':overlay?'#ffffff33':['bathroom','kitchen'].includes(r.type)?'#ecf4f4':'#ffffff'}" stroke="${r.id===selected?'#d9a400':'#ccd3ce'}" stroke-width=".09"/>`;
 const rx=r.x+r.width/2,ry=r.y+r.depth/2,available=(turned?r.depth:r.width)-.6;
 const fs=Math.max(.3,Math.min(.85,available/13));
 const words=r.name.toUpperCase().split(/\s+/),lines=[];let current='';
 for(const word of words){if(current&&(current+' '+word).length*fs*.57>available*.8){lines.push(current);current=word;}else current+=(current?' ':'')+word;}if(current)lines.push(current);
 const step=fs*1.4,startY=-(lines.length*step)/2;
 s+=`<g data-room-label="${esc(r.id)}" transform="translate(${rx} ${ry}) rotate(${-rotation})" pointer-events="none" fill="#17251d" text-anchor="middle" font-family="Georgia,serif">`;
 lines.forEach((value,i)=>{s+=`<text x="0" y="${startY+i*step}" font-size="${fs}" font-weight="bold">${esc(value)}</text>`;});
 s+=`<text x="0" y="${startY+lines.length*step+fs*.25}" font-size="${fs*.9}">${feet(r.width)} × ${feet(r.depth)}</text></g>`;

 if(r.type==='stairs')for(let i=0;i<16;i++)s+=line(r.x,r.y+i*r.depth/16,r.x+r.width,r.y+i*r.depth/16,'#65726b',.08);
 s+='</g>';}
 for(const w of p.walls){const horizontal=w.axis==='h',a=horizontal?[w.start,w.at,w.end,w.at]:[w.at,w.start,w.at,w.end];s+=line(...a,wallColor,w.external?p.settings.externalWall:p.settings.internalWall,`data-wall="${esc(w.id)}" style="cursor:${horizontal?'ns':'ew'}-resize"`);}
 for(const o of p.openings){const w=p.walls.find(w=>w.id===o.wallId);if(!w)continue;const h=w.axis==='h',start=w.start+o.offset,end=start+o.width;const a=h?[start,w.at,end,w.at]:[w.at,start,w.at,end];s+=line(...a,'#fff',(w.external?p.settings.externalWall:p.settings.internalWall)+.05);const win=['window','vent'].includes(o.kind);s+=line(...a,win?'#38a7c2':'#755a3d',win?.11:.04);const label={door:'D',main:'MD',pocket:'PD',window:'W',vent:'V'}[o.kind];s+=text(h?(start+end)/2:w.at+.7,h?w.at-.3:(start+end)/2,label,.55);
 if(!win&&o.kind!=='pocket'){
 const sign=o.swingSign||(h?-1:1),hinge=o.hinge==='end'?end:start,tip=o.hinge==='end'?start:end;
 const hx=h?hinge:w.at,hy=h?w.at:hinge,lx=h?hinge:w.at+sign*o.width,ly=h?w.at+sign*o.width:hinge,tx=h?tip:w.at,ty=h?w.at:tip;
 s+=`<path d="M ${hx} ${hy} L ${lx} ${ly} Q ${h?tip:lx} ${h?ly:tip} ${tx} ${ty}" fill="none" stroke="#687e70" stroke-width=".08"/>`;
 }

 }
 const road={front:[width/2,depth+1.5],rear:[width/2,-.2],left:[-1,depth/2],right:[width+1,depth/2]}[roadSide];s+=text(...road,'ROAD',.7,'font-weight="bold"');
 for(const w of compoundSegments(p)){const h=w.axis==='h';s+=line(...(h?[w.start,w.at,w.end,w.at]:[w.at,w.start,w.at,w.end]),'#53645c',p.compound.thickness||.5);}
 if(p.gate){const side=p.gate.side,h=['front','rear'].includes(side),at=side==='front'?depth:side==='rear'?0:side==='left'?0:width;const start=p.gate.offset,end=start+p.gate.width;s+=h?line(start,at,end,at,'#b1954e',.18):line(at,start,at,end,'#b1954e',.18);s+=text(h?(start+end)/2:at,h?at-.35:(start+end)/2,'MG',.55);}
 const angle={East:90,South:0,West:-90,North:180}[facing];s+=`<g transform="translate(${width-3} ${depth-3}) rotate(${angle})"><path d="M 0 -1.1 L -.3 .5 L 0 .2 L .3 .5 Z" fill="#c3443b"/><text x="0" y="-1.4" font-size=".6" text-anchor="middle">N</text></g>`;

 s+=fixtureSVG(p);if(legend.length){s+=text(width/2,depth+6.3,'FIXTURE SYMBOL LEGEND',.5);legend.forEach((d,i)=>{s+=text((i%2?3:1)*width/4,depth+7.3+Math.floor(i/2)*.9,d.symbol+' · '+d.name,.42);});}
 if(p.roof?.show2D){const r=roofEstimate(p);s+=`<g pointer-events="none"><rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.depth}" fill="none" stroke="${r.color}" stroke-width=".2" stroke-dasharray=".5 .3"/>${r.style==='gable'?line(r.x+r.width/2,r.y,r.x+r.width/2,r.y+r.depth,r.color,.15):''}${text(r.x+r.width/2,r.y-.6,r.style+' roof · '+r.surface.toFixed(0)+' sq.ft',.55)}</g>`;}
 if(editable)for(const o of p.openings){const w=p.walls.find(w=>w.id===o.wallId);if(!w)continue;const at=w.start+o.offset+o.width/2;s+=`<circle data-opening="${esc(o.id)}" cx="${w.axis==='h'?at:w.at}" cy="${w.axis==='h'?w.at:at}" r=".32" fill="${['window','vent'].includes(o.kind)?'#0b8ca3':'#be7924'}" stroke="white" stroke-width=".08" style="cursor:grab"><title>Drag ${esc(o.kind)} to a wall</title></circle>`;}
 const top=cy-vh/2,bottom=cy+vh/2;
 s+='</g>';
 const sheetText=(y,value,size,bold=false)=>`<text x="${cx}" y="${y}" font-family="Georgia,serif" font-size="${size}" text-anchor="middle" fill="#17251d" ${bold?'font-weight="bold"':''}>${esc(value)}</text>`;
 s+=sheetText(top+.9,p.title.toUpperCase(),Math.min(.9,vw/Math.max(30,p.title.length)*1.4),true);
 s+=sheetText(bottom-2.2,'FLOOR PLAN · '+facing.toUpperCase()+' FACING',.75,true)+sheetText(bottom-1.2,`TOTAL PLOT AREA = ${(width*depth).toFixed(0)} sqft`,.6)+sheetText(bottom-.4,'OH I SEE · CONCEPT / REVIEW REQUIRED',.4);
 return s+'</svg>';
}
