// Full-width prepared loop; the page's text and controls remain live HTML.
const video=document.getElementById('hero-construction-film');
const button=document.getElementById('hero-film-control');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
if(video&&button){
 let started=false,resumeWhenVisible=false;
 const label=text=>{button.textContent=text;button.setAttribute('aria-label',text+' construction animation');};
 const stop=()=>{video.pause();video.classList.remove('is-playing');label('Play');};
 const play=async()=>{
  if(!started){
   for(const [src,type] of [['/videos/home-static-camera-hd.mp4?v=1','video/mp4']]){const source=document.createElement('source');source.src=src;source.type=type;video.append(source);}
   started=true;video.load();
  }
  try{await video.play();video.classList.add('is-playing');label('Pause');}catch{stop();}
 };
 button.addEventListener('click',()=>{if(video.paused)play();else{video.pause();label('Resume');}});
 video.addEventListener('error',()=>{stop();button.hidden=true;});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){resumeWhenVisible=!video.paused;video.pause();}else if(resumeWhenVisible){resumeWhenVisible=false;play();}});
 reduced.addEventListener('change',()=>{if(reduced.matches){resumeWhenVisible=false;stop();}});
 if(!reduced.matches&&!navigator.connection?.saveData)play();
}
