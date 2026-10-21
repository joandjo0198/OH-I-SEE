// Animate the repaired artwork; never load the damaged video frames.
const scene = document.getElementById('hero-clean-motion');
const button = document.getElementById('hero-film-control');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
if (scene && button) {
  let playing = !reduced.matches;
  const render = () => {
    scene.classList.toggle('is-running', playing && !document.hidden);
    button.textContent = playing ? 'Pause' : 'Play';
    button.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} architectural animation`);
    button.setAttribute('aria-pressed', String(playing));
  };
  button.addEventListener('click', () => { playing = !playing; render(); });
  document.addEventListener('visibilitychange', render);
  reduced.addEventListener('change', () => { playing = !reduced.matches; render(); });
  render();
}
