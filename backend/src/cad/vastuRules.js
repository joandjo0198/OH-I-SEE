'use strict';
const preferred = {master:['SW'],bedroom:['NW'],guest:['NW'],kitchen:['SE','NW'],pooja:['NE'],living:['NE','E'],drawing:['NE','E'],dining:['C','E'],bathroom:['W','NW'],stair:['SW','S','W'],office:['N','E']};
function zoneAt(r, envelope) {const x=(r.x+r.w/2-envelope.x)/envelope.w,y=(r.y+r.h/2-envelope.y)/envelope.h;return (y<1/3?'S':y>2/3?'N':'')+(x<1/3?'W':x>2/3?'E':'') || 'C';}
function targets(r) {return preferred[/master/i.test(r.name)?'master':r.type] || [];}
module.exports = {zoneAt, targets};
