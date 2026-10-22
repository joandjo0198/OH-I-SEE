import { createLuxuryResidence } from './luxury-residence-scene.js';
const host=document.getElementById('hero-construction-model');
const button=document.getElementById('hero-film-control');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
if(host && button) {
 const events=new AbortController();
 let model,frame=0,elapsed=0,last=0,playing=false,disposed=false;
 const duration=18000;
 const label=()=>{button.textContent=elapsed>=duration?'Replay':playing?'Pause':'Play';button.setAttribute('aria-label',button.textContent+' construction animation');button.setAttribute('aria-pressed',String(playing));};
 function tick(now){frame=0;if(!playing||disposed||document.hidden)return;elapsed=Math.min(duration,elapsed+Math.min(100,now-last));last=now;model.render(elapsed/duration);if(elapsed>=duration)playing=false;else frame=requestAnimationFrame(tick);label();}
 function start(){if(!model||reduced.matches)return;if(elapsed>=duration)elapsed=0;playing=true;last=performance.now();cancelAnimationFrame(frame);frame=requestAnimationFrame(tick);label();}
 function completed(){cancelAnimationFrame(frame);playing=false;elapsed=duration;model?.render(1);label();}
 button.disabled=true;
 createLuxuryResidence(host,{fixedConstruction:true}).then(value=>{
  if(disposed){value.dispose();return;}model=value;host.classList.add('is-ready');button.disabled=false;
  // Read-only inspection supports camera/geometry regression checks.
  host.inspectConstruction=()=>model.inspect();
  if(reduced.matches)completed();else {model.render(0);start();}
 }).catch(()=>{button.hidden=true;host.hidden=true;});
 button.addEventListener('click',()=>{if(playing){playing=false;cancelAnimationFrame(frame);label();}else start();},{signal:events.signal});
 document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(frame);if(!document.hidden&&playing){last=performance.now();frame=requestAnimationFrame(tick);}},{signal:events.signal});
 reduced.addEventListener('change',()=>{if(reduced.matches)completed();},{signal:events.signal});
 window.addEventListener('pagehide',event=>{if(event.persisted)return;disposed=true;cancelAnimationFrame(frame);events.abort();model?.dispose();},{signal:events.signal});
}
