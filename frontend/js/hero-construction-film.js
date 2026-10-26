import {constructionFrame, constructionSvg} from './hero-rigid-construction.mjs';

const hero = document.getElementById('hero');
const button = document.getElementById('hero-film-control');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
if (hero && button) {
  // No video, camera motion, per-frame warping, or interpolated building edges.
  hero.insertAdjacentHTML('afterbegin', constructionSvg());
  const scene = hero.querySelector('.hero-rigid-construction');
  const groups = [...scene.querySelectorAll('[data-construction-stage]')];
  let elapsed = 0, previous = null, frame = null;
  let playing = !reduced.matches && !navigator.connection?.saveData;
  let visible = true;
  function paint() {
    const state = constructionFrame(elapsed);
    groups.forEach((group, i) => {
      group.querySelector('[data-shade]').setAttribute('opacity', state.layers[i].shade.toFixed(4));
      const lines = group.querySelector('[data-lines]');
      lines.setAttribute('opacity', state.layers[i].line.toFixed(4));
      lines.setAttribute('stroke-dashoffset', (1-state.layers[i].draw).toFixed(4));
    });
    button.textContent = playing ? 'Pause' : 'Play construction';
    button.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} house construction reveal`);
    button.setAttribute('aria-pressed', String(playing));
  }
  function tick(now) {
    if (previous !== null) elapsed += Math.min((now-previous)/1000, .1);
    previous = now;
    paint();
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null; previous = null;
    paint();
    if (playing && visible && !document.hidden) frame = requestAnimationFrame(tick);
  }
  button.addEventListener('click', () => { playing = !playing; sync(); });
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', () => { if(reduced.matches){playing=false;elapsed=0;} sync(); });
  const observer = new IntersectionObserver(entries => {visible=entries[0].isIntersecting;sync();});
  observer.observe(hero);
  window.addEventListener('pagehide', () => {if(frame!==null)cancelAnimationFrame(frame);observer.disconnect();});
  sync();
}
