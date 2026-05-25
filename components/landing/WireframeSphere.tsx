"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// Reads `--accent-rgb` ("163 230 53") from the document and returns a THREE.Color.
// The whole page sits under a global `hue-rotate-90` filter, so using the same
// accent value keeps the sphere in sync with the buttons/text after rotation.
function readAccent(): THREE.Color {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--accent-rgb")
    .trim();
  const [r, g, b] = raw.split(/\s+/).map(Number);
  if ([r, g, b].some(Number.isNaN)) return new THREE.Color(0.64, 0.9, 0.21);
  return new THREE.Color(r / 255, g / 255, b / 255);
}

// Custom point shader: each node is drawn as a round, soft-edged glow computed
// from gl_PointCoord. A PointsMaterial without a working texture renders hard
// squares — this discards everything outside a circle, so it can never be square.
const NODE_VERT = /* glsl */ `
  uniform float uSize;
  uniform float uScale; // 0.5 * drawingBufferHeight, for perspective attenuation
  uniform float uTime;
  uniform float uPulse; // 0 freezes the wave into a static gradient (reduced motion)
  attribute float aGrad; // 0..1 position along the sweep axis
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    // traveling wave: a band of large nodes sweeps across the axis over time
    float wave = sin(aGrad * 6.2831 - uTime * 1.2) * 0.5 + 0.5; // 0..1
    float amt = mix(aGrad, wave, uPulse); // reduced motion -> static big->small
    float size = uSize * (0.35 + amt * 2.0); // small..big
    gl_PointSize = size * (uScale / -mv.z);
    vAlpha = 0.5 + amt * 0.5; // big nodes glow brighter
    gl_Position = projectionMatrix * mv;
  }
`;

const NODE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    // distance from point center: 0 at core, 1 at the quad edge
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float glow = 1.0 - d;
    float core = pow(glow, 1.6);   // soft falloff
    float alpha = core * vAlpha;
    // brighten the core toward white so additive blending blooms
    vec3 col = mix(uColor, vec3(1.0), pow(glow, 4.0) * 0.7);
    gl_FragColor = vec4(col, alpha);
  }
`;

export function WireframeSphere() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    const BASE_ROT_X = 0.35;
    const MAX_TILT_Y = 0.65;
    const MAX_TILT_X = 0.45;
    const LERP = 0.07;
    const IDLE_DELAY_MS = 1200;
    const IDLE_SPIN = 0.18;

    let w = mount.clientWidth || 1;
    let h = mount.clientHeight || 1;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.z = 4.2;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0); // transparent — let the page bg show
    renderer.domElement.style.display = "block";
    mount.appendChild(renderer.domElement);

    const accent = readAccent();
    const group = new THREE.Group();

    // main wireframe sphere
    const geo = new THREE.IcosahedronGeometry(1.6, 4);
    const wire = new THREE.WireframeGeometry(geo);
    const lines = new THREE.LineSegments(
      wire,
      new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.55 })
    );
    group.add(lines);

    // vertices as glowing nodes — round, additive-blended glow via custom shader
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    const NODE_SIZE = 0.16;

    // aGrad: each node's 0..1 position along the sweep axis (the shader uses this
    // to make a "big" band pulse across the sphere over time). Swap axis/sign to
    // change the sweep direction. Fixed in object space, so it spins with the sphere.
    const SPHERE_R = 1.6;
    const pos = geo.attributes.position;
    const nodeCount = pos.count;
    const grad = new Float32Array(nodeCount);
    for (let i = 0; i < nodeCount; i++) {
      grad[i] = (pos.getX(i) + SPHERE_R) / (2 * SPHERE_R); // 0 on -X side, 1 on +X side
    }
    geo.setAttribute("aGrad", new THREE.BufferAttribute(grad, 1));

    const pointsMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: accent.clone() },
        uSize: { value: NODE_SIZE },
        uScale: { value: 0.5 * h * pixelRatio },
        uTime: { value: 0 },
        uPulse: { value: reduceMotion ? 0 : 1 },
      },
      vertexShader: NODE_VERT,
      fragmentShader: NODE_FRAG,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false, // near nodes shouldn't occlude the bloom of far ones
    });
    const points = new THREE.Points(geo, pointsMat);
    group.add(points);

    group.rotation.x = BASE_ROT_X;
    scene.add(group);

    const mouse = { x: 0, y: 0 };
    const current = { x: BASE_ROT_X, y: 0 };
    let idleAngle = 0;
    let lastMove = 0;
    const clock = new THREE.Clock();

    const onMouseMove = (e: MouseEvent) => {
      lastMove = performance.now();
      const rect = mount.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      mouse.x = THREE.MathUtils.clamp((e.clientX - cx) / (rect.width / 2), -1, 1);
      mouse.y = THREE.MathUtils.clamp((e.clientY - cy) / (rect.height / 2), -1, 1);
    };

    const onMouseOut = () => {
      mouse.x = 0;
      mouse.y = 0;
    };

    window.addEventListener("mousemove", onMouseMove);
    document.documentElement.addEventListener("mouseleave", onMouseOut);

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      // per-node twinkle is computed in the shader; just advance time
      // (performance.now so it doesn't consume clock.getDelta() used below)
      pointsMat.uniforms.uTime.value = performance.now() / 1000;
      if (!reduceMotion) {
        const dt = clock.getDelta();
        const idle = performance.now() - lastMove > IDLE_DELAY_MS;
        if (idle) idleAngle += dt * IDLE_SPIN;

        const targetX = BASE_ROT_X - mouse.y * MAX_TILT_X;
        const targetY = -mouse.x * MAX_TILT_Y;
        current.x += (targetX - current.x) * LERP;
        current.y += (targetY - current.y) * LERP;
        group.rotation.x = current.x;
        group.rotation.y = current.y + idleAngle;
      }
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      w = mount.clientWidth || 1;
      h = mount.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      pointsMat.uniforms.uScale.value = 0.5 * h * pixelRatio;
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMouseMove);
      document.documentElement.removeEventListener("mouseleave", onMouseOut);
      ro.disconnect();
      geo.dispose();
      wire.dispose();
      lines.geometry.dispose();
      (lines.material as THREE.Material).dispose();
      (points.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mountRef} className="h-full w-full" aria-hidden />;
}
