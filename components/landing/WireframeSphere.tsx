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

export function WireframeSphere() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      // still render once, just don't spin
    }
    const reduceMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

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

    // vertices as faint glowing points
    const points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: accent,
        size: 0.045,
        transparent: true,
        opacity: 0.9,
        sizeAttenuation: true,
      })
    );
    group.add(points);

    // faint larger halo sphere for depth
    const haloGeo = new THREE.IcosahedronGeometry(2.05, 2);
    const halo = new THREE.LineSegments(
      new THREE.WireframeGeometry(haloGeo),
      new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.12 })
    );
    group.add(halo);

    group.rotation.x = 0.35;
    scene.add(group);

    let raf = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      if (!reduceMotion) {
        group.rotation.y = t * 0.18;
        halo.rotation.y = -t * 0.1;
        halo.rotation.x = t * 0.06;
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
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      geo.dispose();
      wire.dispose();
      haloGeo.dispose();
      lines.geometry.dispose();
      (lines.material as THREE.Material).dispose();
      (points.material as THREE.Material).dispose();
      halo.geometry.dispose();
      (halo.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mountRef} className="h-full w-full" aria-hidden />;
}
