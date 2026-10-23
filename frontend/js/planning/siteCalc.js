(function(root) {
  'use strict';
  // Half-inch integer ticks retain 4.5 inch partitions without floating drift.
  const ticks = (value, name) => {
    if (value === '' || value == null || !Number.isFinite(Number(value)) || Number(value) < 0) throw new Error(`${name} is required and must be non-negative.`);
    return Math.round(Number(value) * 24);
  };
  const area = n => Math.round(n / 576 * 1000) / 1000;
  function computeSite(plot, setbacks) {
    const w=ticks(plot.width,'Plot width'), d=ticks(plot.length,'Plot length');
    const s=Object.fromEntries(['front','rear','left','right'].map(k=>[k,ticks(setbacks[k],`${k} setback`)]));
    const ew=w-s.left-s.right, ed=d-s.front-s.rear;
    if(w<=0 || d<=0 || ew<=0 || ed<=0) throw new Error('Setbacks leave no positive buildable envelope. Review all four setbacks and plot dimensions.');
    return {envelopeWidth:ew/24,envelopeDepth:ed/24,buildableArea:area(ew*ed),plotArea:area(w*d),setbackArea:area(w*d-ew*ed),ticks:{width:ew,depth:ed},setbacks:{...setbacks}};
  }
  function fromLand(s) {
    return computeSite({width:s.frontage_ft || s.plot_width_ft || s.plot_width,length:s.depth_ft || s.plot_length_ft || s.plot_length},Object.fromEntries(['front','rear','left','right'].map(k=>[k,s[`setback_${k}_ft`]])));
  }
  function formatFeet(value) {
    const n=ticks(value,'Dimension'), inch=(n%24)/2;
    return `${Math.floor(n/24)}′ ${inch}″`;
  }
  const api={computeSite,fromLand,formatFeet,ticks};
  root.SiteCalc=api;
  if(typeof module!=='undefined' && module.exports) module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
