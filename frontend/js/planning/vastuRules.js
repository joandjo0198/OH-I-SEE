(function(root) {
  'use strict';
  const preferred={master:['SW'],bedroom:['NW'],kitchen:['SE'],pooja:['NE','N'],living:['NE','E'],drawing:['NE','E'],dining:['C','E'],bathroom:['W','NW'],office:['N','E']};
  // Screen axes: road is always at the bottom. Cardinal zones remain geographical.
  const grids={South:['NW','N','NE','W','C','E','SW','S','SE'],East:['SW','W','NW','S','C','N','SE','E','NE'],North:['SE','S','SW','E','C','W','NE','N','NW'],West:['NE','E','SE','N','C','S','NW','W','SW']};
  function zoneAt(x,y,width,depth,facing) {
    const grid=grids[facing];if(!grid)throw new Error('Select North, South, East or West for a rectangular Vastu layout.');
    return grid[Math.min(2,Math.max(0,Math.floor(y/depth*3)))*3+Math.min(2,Math.max(0,Math.floor(x/width*3)))];
  }
  const api={preferred,grids,zoneAt};root.VastuRules=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
