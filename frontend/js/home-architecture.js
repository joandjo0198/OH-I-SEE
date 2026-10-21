// Independent one-shot left entrance. The background and layout never animate.
const heroTrack=document.getElementById('hero-scroll');
const header=document.querySelector('.site-header');
if(heroTrack && header){
 const measureHeader=()=>heroTrack.style.setProperty('--hero-header',header.getBoundingClientRect().height+'px');
 measureHeader();new ResizeObserver(measureHeader).observe(header);
}
const hero=document.getElementById('hero');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const entrances=[];
if(hero && !reduced.matches){
 for(const el of hero.querySelectorAll('.hero-enter')){
  const delay=Number(el.dataset.delay),duration=Math.min(900,1800-delay);
  const distance=el.classList.contains('hero-copy-badge')?80:delay>=1000?140:120;
  el.style.willChange='transform,opacity';
  const animation=el.animate([
   {transform:`translate3d(-${distance}px,0,0)`,opacity:0,filter:'blur(4px)'},
   {transform:'translate3d(0,0,0)',opacity:1,filter:'blur(0)'}
  ],{delay,duration,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'});
  animation.finished.then(()=>{el.style.willChange='auto';}).catch(()=>{el.style.willChange='auto';});
  entrances.push(animation);
 }
 const settle=()=>entrances.forEach(a=>{if(a.playState!=='finished')a.finish();});
 hero.addEventListener('focusin',settle,{once:true});
 reduced.addEventListener('change',()=>{if(reduced.matches)settle();});
}
