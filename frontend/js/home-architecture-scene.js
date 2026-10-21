import * as THREE from "three";
import { residence, planSVG } from "./home-architecture-plan.js";
const clamp = THREE.MathUtils.clamp;
const phase = (p, a, b) => THREE.MathUtils.smoothstep(p, a, b);
export async function createResidencePreview(
  host,
  { background = false } = {},
) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: background,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.setClearColor(0xf1f2e9, background ? 0 : 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = background ? null : new THREE.Color(0xf1f2e9);
  const camera = new THREE.OrthographicCamera(-15, 15, 11, -11, 0.1, 120);
  scene.add(new THREE.HemisphereLight(0xeaf3ff, 0xa59e88, 1.6));
  const sun = new THREE.DirectionalLight(0xfff0d8, 3.5);
  sun.position.set(-10, 24, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -20,
    right: 20,
    top: 20,
    bottom: -20,
    near: 0.5,
    far: 70,
  });
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.04;
  sun.shadow.radius = 4;
  sun.target.position.set(8, 0, 10);
  scene.add(sun, sun.target);
  const mat = (color, roughness = 0.7, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const plaster = mat(0xf0eee5),
    stone = mat(0xc6c3b5),
    dark = mat(0x283a3d),
    wood = mat(0x8d633f),
    glass = mat(0x769aa3, 0.15, 0.55),
    grass = mat(0x687d45),
    leaf = mat(0x57754b),
    paving = mat(0xd0cfc4),
    white = mat(0xf8f7ef);
  const wallGroup = new THREE.Group(),
    finishGroup = new THREE.Group(),
    roofGroup = new THREE.Group(),
    landscape = new THREE.Group(),
    site = new THREE.Group();
  scene.add(site, wallGroup, finishGroup, roofGroup, landscape);
  const resources = [];
  // Procedural surface detail keeps the model self-contained and inexpensive to load.
  function surface(color, woodGrain = false) {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d");
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 256, 256);
    let seed = 41;
    for (let i = 0; i < 6000; i++) {
      seed = (seed * 16807) % 2147483647;
      const x = seed % 256;
      seed = (seed * 16807) % 2147483647;
      const y = seed % 256;
      ctx.fillStyle = i % 2 ? "rgba(255,255,255,.055)" : "rgba(0,0,0,.07)";
      ctx.fillRect(x, y, woodGrain ? 1 : 2, woodGrain ? 25 : 2);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 3);
    t.colorSpace = THREE.SRGBColorSpace;
    resources.push(t);
    return t;
  }
  plaster.bumpMap = surface("#c9c6bb");
  plaster.bumpScale = 0.035;
  stone.map = surface("#bdbbad");
  stone.bumpMap = stone.map;
  stone.bumpScale = 0.07;
  wood.map = surface("#ba9166", true);
  wood.bumpMap = wood.map;
  wood.bumpScale = 0.035;
  const roofStone = mat(0xc4c4b7);
  roofStone.map = surface("#dedbd1");
  const skyCanvas = document.createElement("canvas");
  skyCanvas.width = 512;
  skyCanvas.height = 256;
  const skyContext = skyCanvas.getContext("2d");
  const skyGradient = skyContext.createLinearGradient(0, 0, 0, 256);
  skyGradient.addColorStop(0, "#859dab");
  skyGradient.addColorStop(0.48, "#f4f0dc");
  skyGradient.addColorStop(0.52, "#7b8670");
  skyGradient.addColorStop(1, "#bdb9a9");
  skyContext.fillStyle = skyGradient;
  skyContext.fillRect(0, 0, 512, 256);
  const env = new THREE.CanvasTexture(skyCanvas);
  env.mapping = THREE.EquirectangularReflectionMapping;
  env.colorSpace = THREE.SRGBColorSpace;
  scene.environment = env;
  resources.push(env);

  function box(parent, x, y, z, w, h, d, material) {
    const geometry = new THREE.BoxGeometry(w, h, d);
    resources.push(geometry);
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  box(site, 8, -0.19, 10, 16, 0.3, 20, paving);
  // Floor plane is the exact SVG drawing, mapped 1 SVG unit to 1 metre.
  async function texture(clean) {
    let svg = planSVG(clean, clean ? "texture-clean" : "texture-draft");
    if (background) {
      svg = svg
        .replace(/<rect[^>]*fill="#f5f5ed"[^>]*\/>/, "")
        .replaceAll("#2f4850", "#9aadb1")
        .replaceAll("#29434c", "#9aadb1");
    }
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = 1536;
      canvas.height = 1878;
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      const t = new THREE.CanvasTexture(canvas);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
      resources.push(t);
      return t;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  const [draftTexture, cleanTexture] = await Promise.all([
    texture(false),
    texture(true),
  ]);
  const floorGeometry = new THREE.PlaneGeometry(18, 22);
  resources.push(floorGeometry);
  const floorMaterial = new THREE.MeshBasicMaterial({
    transparent: background,
    map: draftTexture,
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(8, 0.012, 10);
  scene.add(floor);
  const cleanMaterial = new THREE.MeshBasicMaterial({
    map: cleanTexture,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const cleanFloor = new THREE.Mesh(floorGeometry, cleanMaterial);
  cleanFloor.rotation.x = -Math.PI / 2;
  cleanFloor.position.set(8, 0.018, 10);
  scene.add(cleanFloor);
  // Solid pieces are split around real door/window apertures rather than painted on a box.
  for (const wall of residence.walls) {
    const [x, z] = wall.a;
    const dx = wall.b[0] - x,
      dz = wall.b[1] - z,
      len = Math.hypot(dx, dz),
      ux = dx / len,
      uz = dz / len;
    let prev = 0;
    const piece = (
      start,
      end,
      bottom,
      height,
      material = plaster,
      parent = wallGroup,
      thickness = 0.19,
    ) => {
      if (end - start < 0.001 || height <= 0) return;
      const m = box(
        parent,
        x + (ux * (start + end)) / 2,
        bottom + height / 2,
        z + (uz * (start + end)) / 2,
        end - start,
        height,
        thickness,
        material,
      );
      m.rotation.y = -Math.atan2(uz, ux);
      return m;
    };
    for (const opening of [...wall.openings, { at: len, w: 0 }]) {
      piece(prev, opening.at, 0, residence.wallHeight);
      if (opening.w) {
        const sill = opening.type === "window" ? 0.85 : 0;
        const top = 2.55;
        piece(opening.at, opening.at + opening.w, 0, sill);
        piece(
          opening.at,
          opening.at + opening.w,
          top,
          residence.wallHeight - top,
        );
        if (opening.type === "window") {
          piece(
            opening.at,
            opening.at + opening.w,
            sill,
            top - sill,
            glass,
            finishGroup,
            0.07,
          );
          piece(
            opening.at,
            opening.at + opening.w,
            sill,
            0.055,
            dark,
            finishGroup,
            0.22,
          );
          piece(
            opening.at,
            opening.at + opening.w,
            top - 0.055,
            0.055,
            dark,
            finishGroup,
            0.22,
          );
          for (const at of [
            opening.at,
            opening.at + opening.w / 2,
            opening.at + opening.w - 0.04,
          ])
            piece(at, at + 0.04, sill, top - sill, dark, finishGroup, 0.22);
        } else {
          piece(
            opening.at,
            opening.at + opening.w,
            0,
            2.5,
            wood,
            finishGroup,
            0.085,
          );
        }
      }
      prev = opening.at + opening.w;
    }
  }
  // Continuous foundation and front veranda remain aligned with the drafted rooms.
  box(site, 7, 0.1, 7, 10.35, 0.2, 10.35, stone);
  floor.renderOrder = 1;
  cleanFloor.renderOrder = 2;
  // Room floors above foundation; drawing stays on top until walls begin rising.
  const roomFloors = [];
  for (const r of residence.rooms.slice(0, 7)) {
    roomFloors.push(
      box(
        site,
        r.x + r.w / 2,
        0.205,
        r.z + r.d / 2,
        r.w - 0.14,
        0.025,
        r.d - 0.14,
        mat(r.name.includes("BEDROOM") ? 0xc0a88b : 0xe5dfcf),
      ),
    );
  }
  box(site, 9.5, 0.16, 13, 5.3, 0.3, 2, stone);
  for (let i = 0; i < 3; i++)
    box(
      site,
      9.5,
      0.035 + i * 0.04,
      14.5 - i * 0.24,
      3.5,
      0.07 + i * 0.08,
      0.26,
      stone,
    );
  // Flat roof, roof terrace and deep horizontal shade reflect a modern Indian residence.
  box(roofGroup, 7, 3.4, 7, 10.6, 0.3, 10.6, white);
  box(roofGroup, 7, 3.66, 2, 10.55, 0.42, 0.16, white);
  box(roofGroup, 2, 3.66, 7, 0.16, 0.42, 10.3, white);
  box(roofGroup, 12, 3.66, 7, 0.16, 0.42, 10.3, white);
  box(roofGroup, 7, 3.67, 12, 10.6, 0.45, 0.2, white);
  box(roofGroup, 9.5, 3.1, 13, 5.7, 0.18, 2.3, white);
  box(finishGroup, 12.15, 1.65, 12.7, 0.3, 3.3, 2.4, stone);
  for (let i = 0; i < 10; i++)
    box(finishGroup, 2.25 + i * 0.16, 1.62, 12.16, 0.08, 3.22, 0.14, wood);
  for (let i = 0; i < 7; i++)
    box(finishGroup, 7.2 + i * 0.26, 2.9, 13, 0.075, 0.13, 2.2, wood);
  box(finishGroup, 9.5, 0.72, 14, 5, 0.055, 0.045, dark);
  for (const x of [7, 8.25, 9.5, 10.75, 12])
    box(finishGroup, x, 0.44, 14, 0.04, 0.85, 0.04, dark);
  const rail = new THREE.MeshPhysicalMaterial({
    color: 0xbed4d1,
    roughness: 0.15,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
  });
  box(finishGroup, 9.5, 0.43, 14, 5, 0.8, 0.025, rail);
  // Usable roof terrace: tiled deck, a timber pergola, and an external stair.
  box(roofGroup, 7, 3.565, 7, 9.95, 0.025, 9.95, roofStone);
  const grout = mat(0xa9aca1);
  for (let i = 0; i < 10; i++) {
    box(roofGroup, 2.5 + i, 3.584, 7, 0.012, 0.006, 9.8, grout);
    box(roofGroup, 7, 3.584, 2.5 + i, 9.8, 0.006, 0.012, grout);
  }
  for (const x of [8, 11.5])
    for (const z of [3, 6]) box(finishGroup, x, 4.65, z, 0.12, 2.2, 0.12, dark);
  for (let i = 0; i < 13; i++)
    box(finishGroup, 7.8 + i * 0.32, 5.78, 4.5, 0.12, 0.17, 3.5, wood);
  box(finishGroup, 9.7, 3.8, 4.4, 1.2, 0.38, 0.65, stone);
  box(finishGroup, 8.45, 3.84, 4.4, 0.55, 0.5, 0.65, white);
  box(finishGroup, 10.8, 3.84, 4.4, 0.55, 0.5, 0.65, white);
  for (let i = 0; i < 16; i++)
    box(
      finishGroup,
      1.15,
      0.11 + i * 0.1075,
      5 + i * 0.36,
      1.2,
      0.22 + i * 0.215,
      0.36,
      stone,
    );
  // Low boundary, gate, pavers and planted beds.
  box(landscape, 0.5, 0.5, 10, 0.22, 1, 19, stone);
  box(landscape, 15.5, 0.5, 10, 0.22, 1, 19, stone);
  box(landscape, 8, 0.5, 0.5, 15, 1, 0.22, stone);
  box(landscape, 11, 0.45, 19.5, 9, 0.9, 0.2, stone);
  for (let i = 0; i < 18; i++)
    box(landscape, 1.2 + i * 0.28, 0.55, 19.5, 0.065, 1.1, 0.09, dark);
  box(landscape, 13.85, 0.02, 10, 2.1, 0.12, 17, grass);
  box(landscape, 7.5, 0.025, 17, 2, 0.12, 3, grass);
  for (let i = 0; i < 6; i++)
    box(landscape, 9.8, 0.055, 15 + i * 0.68, 2.3, 0.07, 0.47, white);
  function tree(x, z, size) {
    const trunkGeo = new THREE.CylinderGeometry(0.09, 0.15, 1.9, 9);
    resources.push(trunkGeo);
    const trunk = new THREE.Mesh(trunkGeo, wood);
    trunk.position.set(x, 0.95, z);
    trunk.castShadow = true;
    landscape.add(trunk);
    for (let i = 0; i < 7; i++) {
      const geo = new THREE.SphereGeometry(
        size * (0.48 + (i % 3) * 0.07),
        12,
        9,
      );
      resources.push(geo);
      const crown = new THREE.Mesh(geo, leaf);
      const angle = i * 2.4;
      crown.position.set(
        x + Math.cos(angle) * size * 0.35,
        2.1 + (i % 3) * 0.28,
        z + Math.sin(angle) * size * 0.35,
      );
      crown.scale.y = 1.15;
      crown.castShadow = true;
      landscape.add(crown);
    }
  }
  tree(14, 4, 1.15);
  tree(14, 16.8, 1.25);
  tree(1, 15, 0.65);
  for (let i = 0; i < 7; i++) {
    const g = new THREE.SphereGeometry(0.3, 10, 7);
    resources.push(g);
    const shrub = new THREE.Mesh(g, leaf);
    shrub.position.set(13.8, 0.28, 7 + i * 0.8);
    shrub.scale.y = 0.8;
    landscape.add(shrub);
  }
  // A restrained parked car gives human scale to the drafted parking bay.
  const car = new THREE.Group();
  landscape.add(car);
  box(car, 3.85, 0.5, 16.2, 1.8, 0.55, 3.5, mat(0xd6dcda, 0.25, 0.45));
  box(car, 3.85, 0.98, 16.1, 1.55, 0.55, 1.85, glass);
  box(car, 3.85, 1.27, 16.1, 1.5, 0.08, 1.45, white);
  for (const x of [2.95, 4.75])
    for (const z of [15.1, 17.2]) {
      const g = new THREE.CylinderGeometry(0.32, 0.32, 0.18, 18);
      resources.push(g);
      const wheel = new THREE.Mesh(g, dark);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.32, z);
      car.add(wheel);
    }
  for (const x of [3.2, 4.5]) box(car, x, 0.58, 17.98, 0.35, 0.13, 0.04, white);
  const lightMat = new THREE.MeshStandardMaterial({
    color: 0xffe5ac,
    emissive: 0xffbd59,
    emissiveIntensity: 1.3,
  });
  for (const x of [7.3, 11.7])
    box(finishGroup, x, 2.2, 12.15, 0.1, 0.26, 0.09, lightMat);
  let lastProgress = 0,
    disposed = false;
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    const aspect = width / height;
    camera.left = -11 * aspect;
    camera.right = 11 * aspect;
    camera.top = 11;
    camera.bottom = -11;
    camera.updateProjectionMatrix();
    render(lastProgress);
  }
  function render(progress) {
    if (disposed) return;
    lastProgress = progress;
    const rise = phase(progress, 0.37, 0.7),
      turn = phase(progress, 0.36, 0.79),
      finish = phase(progress, 0.79, 0.97);
    wallGroup.scale.y = Math.max(0.001, rise);
    wallGroup.visible = progress > 0.365;
    finishGroup.visible = progress > 0.61;
    finishGroup.scale.y = Math.max(0.001, rise);
    roofGroup.visible = progress > 0.65;
    roofGroup.scale.y = phase(progress, 0.65, 0.8);
    landscape.visible = progress > 0.82;
    landscape.scale.y = Math.max(0.001, finish);
    site.visible = progress > 0.37;
    roomFloors.forEach((m) => (m.visible = progress > 0.4));
    cleanMaterial.opacity = phase(progress, 0.2, 0.36);
    floor.visible = progress < 0.43;
    cleanFloor.visible = progress < 0.43;
    plaster.color.set(0xf6f5ef).lerp(new THREE.Color(0xe6e0ce), finish);
    stone.color.set(0xd3d4cf).lerp(new THREE.Color(0xb5b5a5), finish);
    wood.color.set(0xe6e5dd).lerp(new THREE.Color(0x896044), finish);
    glass.color.set(0xd1d9d8).lerp(new THREE.Color(0x547e88), finish);
    camera.position.set(8 + turn * 19, 32 - turn * 17, 10.001 + turn * 25);
    camera.lookAt(8, turn * 1.3, 10);
    camera.zoom =
      (1 + turn * 0.2) * Math.min(1, (camera.right - camera.left) / 22 / 1.45);
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  host.classList.add("model-ready");
  resize();
  renderer.domElement.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    host.classList.remove("model-ready");
    host.dispatchEvent(new CustomEvent("preview-unavailable"));
  });
  return {
    render,
    dispose() {
      disposed = true;
      ro.disconnect();
      resources.forEach((r) => r.dispose());
      scene.traverse((o) => {
        if (o.material) {
          o.material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
      host.classList.remove("model-ready");
    },
  };
}
