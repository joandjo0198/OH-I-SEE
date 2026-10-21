/** Progressive 3D motion for the public website. Content is never hidden by CSS.
 * Animations start only when a visible element enters the viewport, and are
 * cancelled for reduced motion, keyboard focus, or when the page is hidden.
 */
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
const activeAnimations = new Map();
const registered = new WeakSet();
const visibleScenes = new Set();
let observer,
  sceneObserver,
  frame = 0,
  started = false;
const cards =
  ".journey-card,.engine-card,.ai-engine-card,.quality-card,.cat-card-dark,.professional-card,.ai-feature-card,.product-card,.service-card,.category-card,.cost-opt-panel";
const headings =
  ".hp-section-title,.ai-assistant-title,.cost-opt-title,.build-cta-title,.section-title,.page-title,.section-heading";
const blocked =
  'header,footer,dialog,[role="dialog"],form,.modal,.ent-drawer-overlay,.mobile-nav-overlay,.home-transformation';
const progress = document.createElement("div");
progress.className = "site-scroll-depth";
progress.setAttribute("aria-hidden", "true");
progress.innerHTML = "<span></span>";
document.body.appendChild(progress);

function cancel(element) {
  activeAnimations.get(element)?.cancel();
  activeAnimations.delete(element);
}
function reveal(element, direction = "up", delay = 0) {
  if (
    reduceMotion.matches ||
    element.matches(":focus-within") ||
    document.hidden
  )
    return;
  cancel(element);
  const mobile = innerWidth < 650;
  const distance = mobile ? 28 : 75;
  const origin = {
    down: `translate3d(0,-${distance}px,-60px) rotateX(12deg)`,
    left: `translate3d(-${distance}px,12px,-60px) rotateY(9deg)`,
    right: `translate3d(${distance}px,12px,-60px) rotateY(-9deg)`,
    up: `translate3d(0,${distance * 0.65}px,-70px) rotateX(-9deg)`,
    depth:
      "perspective(1100px) translate3d(0,35px,-160px) rotateX(10deg) rotateY(-8deg) scale(.94)",
  }[direction];
  const animation = element.animate(
    [
      { opacity: 0, transform: origin },
      {
        opacity: 1,
        transform: "translate3d(0,0,0) rotateX(0) rotateY(0) scale(1)",
      },
    ],
    {
      duration: mobile ? 650 : 950,
      delay,
      easing: "cubic-bezier(.18,.75,.22,1)",
      fill: "backwards",
    },
  );
  activeAnimations.set(element, animation);
  animation.finished
    .then(() => {
      if (activeAnimations.get(element) === animation)
        activeAnimations.delete(element);
    })
    .catch(() => {});
}
function register(element, direction, delay = 0) {
  if (registered.has(element) || element.closest(blocked)) return;
  registered.add(element);
  element.dataset.motionDirection = direction;
  element.dataset.motionDelay = delay;
  observer.observe(element);
}
function registerContent(root = document) {
  root.querySelectorAll(headings).forEach((heading, index) => {
    register(heading, index % 2 ? "right" : "left");
    const copy = heading.nextElementSibling;
    if (copy?.matches("p,.hp-section-sub"))
      register(copy, index % 2 ? "left" : "right", 100);
  });
  root.querySelectorAll(cards).forEach((card) => {
    if (card.closest(blocked)) return;
    const siblings = [...card.parentElement.children];
    const index = siblings.indexOf(card);
    register(card, index % 2 ? "right" : "left", (index % 4) * 75);
    card.classList.add("depth-card");
  });
  root
    .querySelectorAll(
      ".home-design-next h2,.home-design-actions,.cost-opt-suggestions,.workflow-steps,.brand-strip",
    )
    .forEach((el) => register(el, "up"));
}
function architecturalAtmosphere() {
  document
    .querySelectorAll(".hp-section,.build-cta-section,.home-design-next")
    .forEach((section, i) => {
      section.classList.add("motion-scene");
      const ornament = document.createElement("div");
      ornament.className = "architectural-depth";
      ornament.setAttribute("aria-hidden", "true");
      ornament.innerHTML = `<svg viewBox="0 0 520 420" fill="none" xmlns="http://www.w3.org/2000/svg"><g stroke="currentColor" stroke-width=".8"><path d="M40 255L250 365 475 240 263 130Z M40 255V115L263 10 475 115V240 M40 115L250 225 475 115 M250 225V365 M263 10V130 M100 145V285 M170 182V322 M325 185V324 M400 150V282"/><path d="M15 277L250 400 505 258 M15 260V292 M505 244V273 M24 105L263 -8 491 102" stroke-dasharray="4 6"/><path d="M100 235L170 269V211L100 177Z M326 225L400 185V244L326 285Z"/><path d="M-10 360H520 M-10 390H520" opacity=".35"/></g></svg>`;
      section.appendChild(ornament);
      section.style.setProperty("--scene-side", i % 2 ? "auto" : "-100px");
      section.style.setProperty("--scene-right", i % 2 ? "-100px" : "auto");
      sceneObserver.observe(section);
    });
}
function updateDepth() {
  frame = 0;
  const max = document.documentElement.scrollHeight - innerHeight;
  progress.firstElementChild.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
  if (reduceMotion.matches || document.hidden) return;
  visibleScenes.forEach((section) => {
    const rect = section.getBoundingClientRect();
    const position = Math.max(
      -1,
      Math.min(1, (rect.top + rect.height / 2 - innerHeight / 2) / innerHeight),
    );
    section.style.setProperty("--scene-y", `${position * 45}px`);
    section.style.setProperty("--scene-angle", `${position * 9}deg`);
  });
}
function queueDepth() {
  if (!frame) frame = requestAnimationFrame(updateDepth);
}
function start() {
  if (started) return;
  started = true;
  document.body.classList.add("motion-enabled");
  observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const element = entry.target;
        observer.unobserve(element);
        reveal(
          element,
          element.dataset.motionDirection,
          Number(element.dataset.motionDelay),
        );
      }),
    { threshold: 0.08 },
  );
  sceneObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) =>
      entry.isIntersecting
        ? visibleScenes.add(entry.target)
        : visibleScenes.delete(entry.target),
    );
    queueDepth();
  });
  architecturalAtmosphere();
  registerContent();
  const hero = document.querySelector(".hero-ai");
  if (hero && !hero.closest("#hero-scroll")) {
    const entrance = [
      [".hero-ai-eyebrow", "down", 0],
      [".hero-ai-h1", "down", 120],
      [".hero-ai-tagline", "left", 260],
      [".hero-ai-desc", "right", 330],
      [".hero-ai-ctas", "up", 410],
      [".hero-ai-stats", "up", 480],
      [".hero-drawing", "depth", 180],
    ];
    entrance.forEach(([selector, direction, delay]) => {
      const element = hero.querySelector(selector);
      if (element && element.getBoundingClientRect().top < innerHeight)
        reveal(element, direction, delay);
      else if (element) register(element, direction);
    });
  } else {
    document
      .querySelectorAll("main h1,.hero h1,.page-header h1,.hero-section h1")
      .forEach((el) => register(el, "down"));
  }
  // Product and recommendation cards can arrive after initial page load.
  document
    .querySelectorAll(
      "#recommended-products,.products-grid,#products-grid,.products-rec-grid",
    )
    .forEach((root) => {
      new MutationObserver(() => registerContent(root)).observe(root, {
        childList: true,
      });
    });
  queueDepth();
}
// Wait for the existing loader, rather than playing the entrance behind it.
const loader = document.querySelector(".page-loader");
if (!loader || loader.classList.contains("hidden")) start();
else {
  const loaderObserver = new MutationObserver(() => {
    if (loader.classList.contains("hidden")) {
      loaderObserver.disconnect();
      start();
    }
  });
  loaderObserver.observe(loader, {
    attributes: true,
    attributeFilter: ["class"],
  });
  setTimeout(() => {
    loaderObserver.disconnect();
    start();
  }, 2500);
}
let tiltedCard;
document.addEventListener(
  "pointermove",
  (event) => {
    if (reduceMotion.matches || !finePointer.matches) return;
    const card = event.target.closest(".depth-card");
    if (tiltedCard && tiltedCard !== card) {
      tiltedCard.style.removeProperty("--depth-rx");
      tiltedCard.style.removeProperty("--depth-ry");
    }
    tiltedCard = card;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty(
      "--depth-rx",
      `${(-(event.clientY - rect.top - rect.height / 2) / rect.height) * 5}deg`,
    );
    card.style.setProperty(
      "--depth-ry",
      `${((event.clientX - rect.left - rect.width / 2) / rect.width) * 6}deg`,
    );
  },
  { passive: true },
);
document.addEventListener("focusin", (event) => {
  for (const [element] of activeAnimations)
    if (element.contains(event.target)) cancel(element);
});
window.addEventListener("scroll", queueDepth, { passive: true });
window.addEventListener("resize", queueDepth, { passive: true });
document.addEventListener("visibilitychange", () => {
  if (document.hidden)
    for (const [element] of activeAnimations) cancel(element);
});
reduceMotion.addEventListener("change", () => {
  if (reduceMotion.matches)
    for (const [element] of activeAnimations) cancel(element);
});
document.addEventListener("architecture-stage-change", () => {
  ["stage-title", "stage-description"].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) reveal(el, i ? "right" : "left", i * 60);
  });
});
