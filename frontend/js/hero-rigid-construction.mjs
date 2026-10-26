// A fixed drawing, not a sequence of generated viewpoints. All image and
// architectural coordinates remain constant; only opacity/stroke reveal vary.
export const SCENE = Object.freeze({width:1920,height:954,duration:14});
export const STAGES = Object.freeze([
  {id:'foundation',start:3,end:5,points:'656,576 910,554 1457,472 1470,832 1374,903 737,832',
    lines:'M737 832V603L1457 491V832 M910 554V853 M1079 580V855 M1368 535V844 M737 832L1374 903L1470 832 M1080 855L1374 872 M1080 869L1374 887'},
  {id:'upper',start:5,end:7.5,points:'667,338 1420,173 1569,255 1569,520 1455,560 1455,473 910,568 656,595',
    lines:'M667 338V595L910 568L1455 473V560L1569 520V255 M910 568V269 M1082 532V304 M1160 517V288 M1258 499V265 M1352 481V246 M667 540L910 510L1455 420'},
  {id:'roof',start:7.5,end:9,points:'574,307 1424,70 1567,241 1568,277 1416,126 669,370 575,338',
    lines:'M574 307L1424 70L1567 241V277L1416 126L669 370L575 338Z M575 338L1424 100L1568 277'},
]);
const smooth = t => {t=Math.max(0,Math.min(1,t));return t*t*t*(10+t*(-15+6*t));};
export function constructionFrame(seconds) {
  const t=((seconds%SCENE.duration)+SCENE.duration)%SCENE.duration;
  const blueprint=smooth((t-1)/1.4);
  return {
    stage:t<1?'Completed home':t<3?'Design outline':t<5?'Ground floor':t<7.5?'Upper floor':t<9?'Roof & finishing':'Completed home',
    layers:STAGES.map(s=>{const reveal=smooth((t-s.start)/(s.end-s.start));return {id:s.id,shade:.86*blueprint*(1-reveal),line:blueprint*(1-reveal),draw:smooth((t-1.3)/1.5)};})
  };
}
export function constructionSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="hero-rigid-construction" viewBox="0 0 ${SCENE.width} ${SCENE.height}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <defs><pattern id="hero-draft-grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#a4e6f2" stroke-opacity=".12" stroke-width="1"/></pattern>
    ${STAGES.map(s=>`<clipPath id="hero-clip-${s.id}"><polygon points="${s.points}"/></clipPath>`).join('')}</defs>
    ${STAGES.map(s=>`<g data-construction-stage="${s.id}"><g data-shade opacity="0" clip-path="url(#hero-clip-${s.id})"><rect width="1920" height="954" fill="#0e2836"/><rect width="1920" height="954" fill="url(#hero-draft-grid)"/></g><path data-lines opacity="0" d="${s.lines}" fill="none" stroke="#c8edf0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></g>`).join('')}
  </svg>`;
}
