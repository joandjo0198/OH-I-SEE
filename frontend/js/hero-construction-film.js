// A fixed photograph with independent lighting. No video or camera transforms.
const scene=document.getElementById('hero-fixed-lighting');
const button=document.getElementById('hero-film-control');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
if(scene && button){
 const events=new AbortController();
 let playing=!reduced.matches;
 function render(){
  scene.classList.toggle('is-running',playing&&!document.hidden&&!reduced.matches);
  button.hidden=reduced.matches;
  button.textContent=playing?'Pause':'Play lighting';
  button.setAttribute('aria-label',`${playing?'Pause':'Play'} architectural lighting animation`);
  button.setAttribute('aria-pressed',String(playing));
 }
 button.addEventListener('click',()=>{playing=!playing;render();},{signal:events.signal});
 document.addEventListener('visibilitychange',render,{signal:events.signal});
 reduced.addEventListener('change',()=>{playing=!reduced.matches;render();},{signal:events.signal});
 window.addEventListener('pagehide',event=>{if(!event.persisted){scene.classList.remove('is-running');events.abort();}},{signal:events.signal});
 render();
}
