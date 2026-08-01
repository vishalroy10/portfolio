import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import SplitType from 'split-type';

gsap.registerPlugin(ScrollTrigger);

// ==========================================
// 1. LENIS SMOOTH SCROLL
// ==========================================
const lenis = new Lenis({
  lerp: 0.05,
  smoothWheel: true,
});

lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0, 0);

// ==========================================
// 1.5 NAVBAR SCROLL INTERACTION
// ==========================================
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    navbar?.classList.add('scrolled');
  } else {
    navbar?.classList.remove('scrolled');
  }
});

// ==========================================
// 2. CUSTOM CURSOR
// ==========================================
const cursor = document.getElementById('cursor');
if (cursor) {
  window.addEventListener('mousemove', (e) => {
    gsap.to(cursor, {
      x: e.clientX,
      y: e.clientY,
      duration: 0.1,
      ease: "power2.out"
    });
  });

  const links = document.querySelectorAll('a, .skill-tag');
  links.forEach(link => {
    link.addEventListener('mouseenter', () => gsap.to(cursor, { scale: 2.5, backgroundColor: '#ff3366' }));
    link.addEventListener('mouseleave', () => gsap.to(cursor, { scale: 1, backgroundColor: '#00f0ff' }));
  });
}

// ==========================================
// 3. UI ANIMATIONS
// ==========================================
const initUI = () => {
  const splitTexts = document.querySelectorAll('.split-text');
  splitTexts.forEach((text) => {
    const split = new SplitType(text as HTMLElement, { types: 'lines,words' });
    gsap.from(split.words, {
      scrollTrigger: { trigger: text, start: 'top 85%' },
      y: 50, opacity: 0, duration: 0.8, stagger: 0.02, ease: 'power3.out'
    });
  });

  gsap.utils.toArray('.fade-up').forEach((el: any) => {
    gsap.from(el, {
      scrollTrigger: { trigger: el, start: 'top 85%' },
      y: 30, opacity: 0, duration: 1, ease: 'power3.out'
    });
  });

  gsap.from('.stagger-card', {
    scrollTrigger: { trigger: '.projects-list', start: 'top 80%' },
    y: 50, opacity: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out'
  });
};

// ==========================================
// 4. THREE.JS VERTICAL MAP LAYOUT
// ==========================================
const canvas = document.querySelector('#webgl-canvas') as HTMLCanvasElement;
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050419, 0.015);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x050419);

// Heavy Bloom for Electric Glow
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 2.5, 0.5, 0.2);
const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// ------------------------------------------
// 4.1 VERTICAL BUILDING NODES
// ------------------------------------------
// Layout directly on the XY plane. Y controls scroll distance.
const nodes = [
  new THREE.Vector3(0, 0, 0),          // Hero
  new THREE.Vector3(-12, -40, 0),      // About (Left)
  new THREE.Vector3(12, -80, 0),       // Featured (Right)
  new THREE.Vector3(-12, -120, 0),     // Skills (Left)
  new THREE.Vector3(12, -160, 0),      // Repos (Right)
  new THREE.Vector3(0, -200, 0)        // Contact (Center)
];

const buildingNodes: { group: THREE.Group, edges: THREE.LineSegments, shockwave: THREE.Mesh, fraction: number, isHit: boolean }[] = [];

// Grab HTML cards for DOM syncing effects
const htmlCards = document.querySelectorAll('.content');

// Flat tech platforms facing the camera on XY plane
const platformGeo = new THREE.CylinderGeometry(4, 4, 1, 16);
const platformEdgeGeo = new THREE.EdgesGeometry(platformGeo);
const platformMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true, transparent: true, opacity: 0.05 });
const platformEdgeMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.2 });

const ringGeo = new THREE.RingGeometry(4.5, 5, 32);
const ringMat = new THREE.MeshBasicMaterial({ color: 0xff3366, transparent: true, opacity: 0, side: THREE.DoubleSide });

nodes.forEach((pos, index) => {
  const pGroup = new THREE.Group();
  pGroup.position.copy(pos);
  pGroup.position.z -= 2; // Push back slightly behind cards

  const mesh = new THREE.Mesh(platformGeo, platformMat);
  const edgeMatClone = platformEdgeMat.clone();
  const edges = new THREE.LineSegments(platformEdgeGeo, edgeMatClone);
  
  const shockwave = new THREE.Mesh(ringGeo, ringMat.clone());
  
  // Rotate cylinders so their flat top faces outward towards camera (+Z)
  mesh.rotation.x = Math.PI / 2;
  edges.rotation.x = Math.PI / 2;
  
  // Shockwave is already flat on XY by default for RingGeometry
  shockwave.position.z = 1.5;

  pGroup.add(mesh);
  pGroup.add(edges);
  pGroup.add(shockwave);
  scene.add(pGroup);

  buildingNodes.push({ group: pGroup, edges: edges, shockwave: shockwave, fraction: index / (nodes.length - 1), isHit: false });
});

// ------------------------------------------
// 4.2 FOUR-WIRE BUNDLE
// ------------------------------------------
const curves: THREE.CatmullRomCurve3[] = [];
const offsets = [
  new THREE.Vector3(0.5, 0, 0.5),
  new THREE.Vector3(-0.5, 0, 0.5),
  new THREE.Vector3(0.5, 0, -0.5),
  new THREE.Vector3(-0.5, 0, -0.5)
];

const wireGroup = new THREE.Group();
scene.add(wireGroup);

for (let i = 0; i < 4; i++) {
  const offsetPoints = nodes.map(p => p.clone().add(offsets[i]));
  const curve = new THREE.CatmullRomCurve3(offsetPoints, false, 'centripetal', 0.5);
  curves.push(curve);

  const tubeGeo = new THREE.TubeGeometry(curve, 400, 0.03, 5, false);
  const tubeMat = new THREE.MeshBasicMaterial({ color: 0x444466, transparent: true, opacity: 0.05 });
  const wire = new THREE.Mesh(tubeGeo, tubeMat);
  wireGroup.add(wire);
}

// ------------------------------------------
// 4.3 DUAL LIGHTNING PULSES
// ------------------------------------------
const createPulse = (color: number) => {
  const pGeo = new THREE.SphereGeometry(0.3, 16, 16);
  const pMat = new THREE.MeshBasicMaterial({ color: color });
  const pulse = new THREE.Mesh(pGeo, pMat);
  const pLight = new THREE.PointLight(color, 0, 30);
  pulse.scale.setScalar(0.01);
  pulse.add(pLight);
  return { mesh: pulse, light: pLight };
};

const pulse1 = createPulse(0x00f0ff); // Cyan
const pulse2 = createPulse(0xff3366); // Coral
scene.add(pulse1.mesh);
scene.add(pulse2.mesh);

// ------------------------------------------
// 4.4 FLOATING PARTICLES
// ------------------------------------------
const pGeo = new THREE.BufferGeometry();
const pCount = 2000;
const pPos = new Float32Array(pCount * 3);
for(let i=0; i<pCount*3; i++) {
  pPos[i] = (Math.random() - 0.5) * 200;
  pPos[i+1] = (Math.random() - 0.5) * 300;
  pPos[i+2] = (Math.random() - 0.5) * 100 - 20; // Keep behind UI
}
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const pMat = new THREE.PointsMaterial({ size: 0.05, color: 0x00f0ff, transparent: true, opacity: 0.2 });
const particles = new THREE.Points(pGeo, pMat);
scene.add(particles);

// ------------------------------------------
// 4.5 SCROLL STATE LOGIC
// ------------------------------------------
const scrollState = { progress: 0 };
gsap.to(scrollState, {
  progress: 1,
  scrollTrigger: {
    trigger: ".scroll-container",
    start: "top top",
    end: "bottom bottom",
    scrub: 1,
  },
});

camera.position.set(0, 0, 35); // Pull back to see the vertical wall

// ==========================================
// 5. ANIMATION LOOP
// ==========================================
const clock = new THREE.Clock();
let lastScrollProgress = 0;

function animate() {
  const elapsedTime = clock.getElapsedTime();

  const p = Math.max(0, Math.min(scrollState.progress, 0.999)); 
  const scrollVelocity = Math.abs(p - lastScrollProgress);
  lastScrollProgress = p;
  
  // Pulses run down the vertical wall
  const p1_val = Math.min(p + 0.01, 0.999);
  const p2_val = Math.max(p - 0.01, 0);

  const pos1 = curves[0].getPoint(p1_val);
  const pos2 = curves[3].getPoint(p2_val);

  pulse1.mesh.position.copy(pos1);
  pulse2.mesh.position.copy(pos2);

  // -----------------------------------------
  // HIGHLIGHT WIRES ONLY WHEN SCROLLING
  // -----------------------------------------
  const isScrolling = scrollVelocity > 0.0001;
  const targetWireOpacity = isScrolling ? 1.0 : 0.05;
  wireGroup.children.forEach((w: any) => {
    w.material.opacity = THREE.MathUtils.lerp(w.material.opacity, targetWireOpacity, 0.1);
  });

  const targetPulseIntensity = isScrolling ? (6 + Math.random() * 4) : 0;
  pulse1.light.intensity = THREE.MathUtils.lerp(pulse1.light.intensity, targetPulseIntensity, 0.2);
  pulse2.light.intensity = THREE.MathUtils.lerp(pulse2.light.intensity, targetPulseIntensity, 0.2);
  
  const targetPulseScale = isScrolling ? 1 : 0.01;
  pulse1.mesh.scale.lerp(new THREE.Vector3(targetPulseScale, targetPulseScale, targetPulseScale), 0.2);
  pulse2.mesh.scale.lerp(new THREE.Vector3(targetPulseScale, targetPulseScale, targetPulseScale), 0.2);

  // -----------------------------------------
  // HIT THE CARD EFFECT
  // -----------------------------------------
  buildingNodes.forEach((node, index) => {
    const dist = Math.abs(p - node.fraction);
    
    if (dist < 0.02 && isScrolling) {
      (node.edges.material as THREE.Material).opacity = 1;
      
      if (node.shockwave.scale.x < 1.1) {
        node.shockwave.scale.setScalar(1);
        (node.shockwave.material as THREE.Material).opacity = 1;
      }
      
      // Trigger HTML Card Effect
      if (!node.isHit) {
        node.isHit = true;
        const targetCard = htmlCards[index];
        if (targetCard) {
          targetCard.classList.add('hit-flash');
          setTimeout(() => targetCard.classList.remove('hit-flash'), 400); // Quick flash
        }
      }
    } else if (dist > 0.05) {
      node.isHit = false; // Reset when we scroll away
    }

    (node.edges.material as THREE.Material).opacity = THREE.MathUtils.lerp((node.edges.material as THREE.Material).opacity, 0.1, 0.05);
    
    if ((node.shockwave.material as THREE.Material).opacity > 0.01) {
      node.shockwave.scale.addScalar(0.2); // Faster ring expansion
      (node.shockwave.material as THREE.Material).opacity = THREE.MathUtils.lerp((node.shockwave.material as THREE.Material).opacity, 0, 0.05);
    }
  });

  // -----------------------------------------
  // CAMERA TRACKING (Vertical Pan)
  // -----------------------------------------
  const centerPos = curves[1].getPoint(p);
  const targetCamY = centerPos.y;
  
  // Camera moves DOWN the Y axis, matching scroll perfectly
  camera.position.y += (targetCamY - camera.position.y) * 0.05;
  
  // Drifting look for dynamic feel, but generally looking straight ahead at the vertical wall
  camera.position.x = Math.sin(elapsedTime * 0.3) * 2;
  camera.lookAt(centerPos.x * 0.2, centerPos.y - 2, 0);

  // Rotate platforms slowly on their Z axis (since they are facing camera on XY plane)
  buildingNodes.forEach(node => {
    node.group.rotation.z = elapsedTime * 0.2;
  });
  particles.rotation.y = elapsedTime * 0.005;
  particles.rotation.z = elapsedTime * 0.005;

  composer.render();
  requestAnimationFrame(animate);
}

renderer.compile(scene, camera);

window.onload = () => {
  initUI();
  
  gsap.to('#loader', {
    yPercent: -100,
    duration: 1.2,
    ease: 'power4.inOut',
    delay: 0.5,
    onComplete: () => {
      document.getElementById('loader')?.remove();
      ScrollTrigger.refresh();
    }
  });

  animate();
};

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});
