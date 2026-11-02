// Use the supplied footage as the background media only. Existing UI stays intact.
const hero = document.getElementById('hero');
const button = document.getElementById('hero-film-control');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
if (hero && button) {
  const video = document.createElement('video');
  video.className = 'hero-construction-film';
  video.src = '/videos/home-supplied-clean-v5.mp4';
  video.poster = '/videos/home-supplied-clean-poster-v5.jpg';
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'metadata';
  video.setAttribute('aria-hidden', 'true');
  video.style.zIndex = '1';
  const background = hero.querySelector('.hero-clean-background');
  if (background) background.src = video.poster;
  hero.prepend(video);
  let playing = !reduced.matches && !navigator.connection?.saveData;
  let visible = true;
  let disposed = false;
  function paint() {
    button.textContent = playing ? 'Pause' : 'Play construction';
    button.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} house construction animation`);
    button.setAttribute('aria-pressed', String(playing));
  }
  function sync() {
    if (disposed) return;
    paint();
    if (playing && visible && !document.hidden) {
      video.play().catch(() => {
        if (playing && visible && !document.hidden && !disposed) { playing = false; paint(); }
      });
    } else video.pause();
  }
  video.addEventListener('playing', () => {
    if (!playing || !visible || document.hidden || disposed) { video.pause(); return; }
    video.classList.add('is-playing');
  });
  video.addEventListener('error', () => {
    playing = false;
    video.classList.remove('is-playing');
    paint();
  });
  button.addEventListener('click', () => { playing = !playing; sync(); });
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', () => { if (reduced.matches) playing = false; sync(); });
  const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); });
  observer.observe(hero);
  window.addEventListener('pagehide', () => { disposed = true; video.pause(); observer.disconnect(); });
  window.addEventListener('pageshow', () => { if (disposed) { disposed = false; observer.observe(hero); sync(); } });
  sync();
}
