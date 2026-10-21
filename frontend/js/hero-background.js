/**
 * hero-background.js
 *
 * ARCHITECTURE: The 2D→3D transformation happens ONLY inside #house-canvas.
 * The hero viewport (text, buttons, stats, nav) is NEVER touched.
 * The Three.js renderer and SVG plan both mount into #house-canvas.
 *
 * On entry the geometry builds automatically, then holds. Scroll/stage controls take over.
 */
import { luxuryPlan, residenceFallback, residenceElevation } from "./luxury-residence-plan.js";

const track    = document.getElementById("hero-scroll");          // scroll container (200svh tall)
const canvas   = document.getElementById("house-canvas");         // the fixed architectural viewport
const fallback = document.getElementById("house-canvas-fallback");// SVG plan lives here
const reduced  = matchMedia("(prefers-reduced-motion: reduce)");

const stages = [
  ["BLUEPRINT", "Every home begins with a plan."],
  ["LAYOUT",    "Turn your requirements into living space."],
  ["SPATIAL",   "Shape every space around the way you live."],
  ["3D FORM",   "See your home before construction."],
  ["REALIZED",  "From blueprint to the home you imagined."],
];

let preview,
    frame       = 0,
    visible     = true,
    generation  = 0,
    progress    = 0,
    current     = -1,
    staticStage = 0,
    failed      = false;
let referenceView, referenceReady=false;
let playback = 0, playbackTime = 0, playbackLast = 0, playbackMode = "scroll", userSelected = false;

function stopPlayback(){cancelAnimationFrame(playback);playback=0;playbackMode="scroll";}
function startPlayback(){
  stopPlayback();playbackMode="auto";playbackTime=0;playbackLast=performance.now();present(0);
  function tick(now){
    if(playbackMode!=="auto")return;
    if(visible && !document.hidden)playbackTime+=Math.min(now-playbackLast,100);
    playbackLast=now;
    const p=Math.max(0,Math.min(1,(playbackTime-650)/6500));
    present(p);
    if(p<1)playback=requestAnimationFrame(tick);else {playback=0;playbackMode="hold";}
  }
  playback=requestAnimationFrame(tick);
}

/** Update all UI stage indicators. Does NOT move any element. */
function syncStageUI(index) {
  const stageEl = document.getElementById("hero-build-stage");
  const descEl  = document.getElementById("hero-build-description");
  if (stageEl) stageEl.textContent  = `0${index + 1} / ${stages[index][0]}`;
  if (descEl)  descEl.textContent   = stages[index][1];
  document.querySelectorAll("[data-hero-stage]").forEach((btn, i) => {
    if (i === index) btn.setAttribute("aria-current", "step");
    else             btn.removeAttribute("aria-current");
  });
}

/** Drive the house state from scroll progress 0–1. */
function present(p) {
  progress = p;
  const showReference=p>=.999 && referenceReady;
  if(referenceView)referenceView.hidden=!showReference;
  for(const selector of [".hero-ai-content",".hero-stage-nav"]){const node=track?.querySelector(selector);if(node)node.inert=showReference;}
  const index = p >= 0.8 ? 4 : p >= 0.6 ? 3 : p >= 0.4 ? 2 : p >= 0.2 ? 1 : 0;
  canvas?.setAttribute("aria-label", `${stages[index][0]}: ${stages[index][1]}`);
  // Update CSS custom properties on the scroll track (used by progress bar)
  if (track) {
    track.dataset.progress = p.toFixed(3);
    track.dataset.stage    = index;
    track.style.setProperty("--build-progress", p);
    track.style.setProperty("--house-finish", Math.max(0, Math.min(1, (p - 0.78) / 0.22)));
  }
  if (index !== current) {
    current = index;
    syncStageUI(index);
  }
  if (!preview && fallback && fallback.dataset.stage !== String(index)) {
    fallback.innerHTML = residenceFallback(index);
    fallback.dataset.stage = index;
  }
  if (preview && visible && !document.hidden) preview.render(p);
}

function update() {
  frame = 0;
  if (!track || document.hidden) return;
  if (reduced.matches || failed) {
    present([0, 0.3, 0.5, 0.75, 1][staticStage]);
    return;
  }
  if(playbackMode!=="scroll"){present(progress);return;}
  const hero = document.getElementById("hero");
  const top  = parseFloat(getComputedStyle(hero).top) || 0;
  present(
    Math.max(
      0,
      Math.min(
        1,
        (top - track.getBoundingClientRect().top) /
          Math.max(1, track.offsetHeight - hero.offsetHeight),
      ),
    ),
  );
}

function queue() {
  if (!frame) frame = requestAnimationFrame(update);
}

async function setup() {
  if (!canvas) return;
  const version = ++generation;
  stopPlayback();
  preview?.dispose();
  preview = null;
  failed  = false;
  if (track) track.classList.toggle("hero-static", reduced.matches);
  canvas.classList.remove("model-ready");

  // Always show the SVG plan in the fallback slot
  if (fallback) fallback.innerHTML = luxuryPlan();

  current = -1;
  staticStage = reduced.matches ? 4 : 0;
  if (fallback) delete fallback.dataset.stage;


  try {
    const { createLuxuryResidence } = await import("./luxury-residence-scene.js");
    if (version !== generation) return;
    // The full-bleed canvas contains world-space drawing and construction geometry.
    const next = await createLuxuryResidence(canvas);
    if (version !== generation) {
      next.dispose();
      return;
    }
    preview = next;
    canvas.classList.add("model-ready");
    if(!reduced.matches && !userSelected && scrollY<100)startPlayback();
    queue();
  } catch (error) {
    console.warn("Architectural preview: falling back to static floor plan view.", error);
    failed      = true;
    staticStage = 0;
    if (track) track.classList.add("hero-static");
    // Show the final clean plan as fallback
    if (fallback) fallback.innerHTML = residenceFallback(staticStage);
    queue();
  }
}

if (canvas) {
  const hero = document.getElementById('hero');
  // User-requested exact reference handoff after the real geometry finishes.
  // The supplied screenshot is unmodified; CSS excludes its baked navigation header.
  referenceView=document.createElement('section');referenceView.className='hero-reference-final';referenceView.hidden=true;
  referenceView.setAttribute('aria-label','Completed home reference');
  const referenceFrame=document.createElement('div');referenceFrame.className='hero-reference-frame';
  const referenceImage=new Image();referenceImage.alt='Build your project. Your way. A completed modern home at dusk, with a glass balcony, warm timber lighting, landscaped garden and covered parking. 1000+ products, 12 AI engines, 15+ services, 100% genuine products.';
  referenceImage.addEventListener('load',()=>{referenceReady=true;present(progress);});
  referenceImage.src='/images/home-design/reference-final-exact.png';referenceFrame.append(referenceImage);
  hero.querySelectorAll('.hero-ai-ctas > *').forEach((original,index)=>{
    const control=original.cloneNode(true);control.removeAttribute('id');control.removeAttribute('style');
    control.className='hero-reference-action hero-reference-action-'+index;
    control.setAttribute('aria-label',original.textContent.trim());referenceFrame.append(control);
  });
  const replay=document.createElement('button');replay.type='button';replay.className='hero-reference-replay';replay.textContent='↻ Replay construction';
  replay.addEventListener('click',()=>{document.querySelector('[data-hero-stage="0"]').click();requestAnimationFrame(()=>{if(!reduced.matches && !failed)startPlayback();});});
  referenceView.append(referenceFrame,replay);hero.append(referenceView);
  const elevation=document.createElement('div');elevation.className='hero-elevation';elevation.setAttribute('aria-hidden','true');elevation.innerHTML=residenceElevation();hero.appendChild(elevation);
  const trace=document.createElement('div');trace.className='hero-plan-trace';trace.setAttribute('aria-hidden','true');trace.innerHTML=luxuryPlan();hero.appendChild(trace);
  const header = document.querySelector('.site-header');
  function sizeHeader(){track.style.setProperty('--hero-header', (header?.getBoundingClientRect().height || 72)+'px');}
  sizeHeader();
  const content=hero.querySelector('.hero-ai-content');
  function sizeContent(){hero.style.setProperty('--hero-content-end',(content.offsetTop+content.offsetHeight+10)+'px');}
  sizeContent();new ResizeObserver(sizeContent).observe(content);
  if(header)new ResizeObserver(sizeHeader).observe(header);
  setup();
  // One entry sequence, independent of scroll; CSS reserves all final positions.
  const entryItems=[['.hero-ai-eyebrow',500],['.hero-title-main',800],['.hero-ai-h1 .accent',1000],['.hero-ai-tagline',1200],['.hero-ai-desc',1400],['.hero-ai-ctas',1600],['.hero-ai-stats',1800]];
  const entrances=[];
  if(!reduced.matches && scrollY<100)for(const [selector,delay] of entryItems){
    const el=hero.querySelector(selector);if(!el)continue;
    entrances.push(el.animate([{opacity:0,transform:'translate3d(0,16px,0) scale(.985)',filter:'blur(3px)'},{opacity:1,transform:'none',filter:'blur(0)'}],{duration:480,delay,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'}));
  }
  document.documentElement.classList.remove('hero-entry-pending');
  hero.addEventListener('focusin',()=>entrances.forEach(a=>a.finish()),{once:true});
  reduced.addEventListener('change',()=>{if(reduced.matches)entrances.forEach(a=>a.finish());});

  // Wake up on scroll / resize — the canvas tracks itself, the page never moves
  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) queue();
  }).observe(track || canvas);

  window.addEventListener("scroll", () => {stopPlayback();queue();}, { passive: true });
  window.addEventListener("resize",            queue, { passive: true });
  document.addEventListener("visibilitychange", queue);
  reduced.addEventListener("change",           setup);

  // If WebGL context is lost, fall back gracefully without layout shift
  canvas.addEventListener("preview-unavailable", () => {
    stopPlayback();
    preview?.dispose();
    preview     = null;
    failed      = true;
    staticStage = 0;
    if (track)    track.classList.add("hero-static");
    if (fallback) fallback.innerHTML = residenceFallback(staticStage);
    queue();
  });

  // Stage button clicks scroll to the right position, never move text
  document.querySelectorAll("[data-hero-stage]").forEach((button) =>
    button.addEventListener("click", () => {
      userSelected=true;stopPlayback();
      const stage = Number(button.dataset.heroStage);
      if (reduced.matches || failed) {
        staticStage = stage;
        if (!preview && fallback) fallback.innerHTML = residenceFallback(stage);
        queue();
        return;
      }
      const hero = document.getElementById("hero");
      const top  = parseFloat(getComputedStyle(hero).top) || 0;
      window.scrollTo({
        top:
          scrollY +
          track.getBoundingClientRect().top -
          top +
          (track.offsetHeight - hero.offsetHeight) *
            [0, 0.3, 0.5, 0.75, 1][stage],
        behavior: "instant",
      });
      queue();
    }),
  );
}
