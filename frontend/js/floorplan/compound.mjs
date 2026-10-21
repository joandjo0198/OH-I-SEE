export function compoundSegments(p){
 if(!p.compound?.enabled)return [];
 const W=p.plot.width,D=p.plot.depth,g=p.gate,out=[];
 for(const side of ['front','rear','left','right']){
 const h=['front','rear'].includes(side),span=h?W:D,at=side==='front'?D:side==='rear'?0:side==='left'?0:W;
 const ranges=g?.side===side?[[0,g.offset],[g.offset+g.width,span]]:[[0,span]];
 for(const [start,end]of ranges)if(end>start)out.push({axis:h?'h':'v',at,start,end});
 }return out;
}
