// components/graph/NeuralGraph3D.tsx
// A 3D "quantum neural network" view of real Arkiv entities, adapted from
// https://gist.github.com/fabianferno/3926d186c8782e50146385a16982c185
// Agents are hubs, snapshots spiral out as chains, audits are leaf synapses.
// Custom GLSL node/connection shaders + simplex noise + bloom, click-to-pulse,
// click-a-node to inspect, theme palettes. Real data comes from layout3d().
"use client";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import type { GraphEdge, GraphNode, EntityType } from "@/lib/graph/buildGraph";
import { layout3d, type Node3D } from "@/lib/graph/layout3d";

export interface NeuralGraph3DHandle {
  focus: (id: string) => void;
}

type Theme = {
  name: string;
  colors: Record<EntityType, number>;
  pulse: number[];
};

// Single brand palette drawn from the app's design tokens (globals.css):
// lime accent on near-black. Agents brightest, snapshots accent lime, audits deep lime.
const THEMES: Theme[] = [
  {
    name: "Lime",
    colors: { AgentCard: 0xbef264, StateSnapshot: 0xa3e635, AuditLog: 0x65a30d },
    pulse: [0xbef264, 0xa3e635, 0xd9f99d],
  },
];

const noiseFunctions = `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const nodeShader = {
  vertexShader: `${noiseFunctions}
  attribute float nodeSize; attribute float nodeType; attribute vec3 nodeColor; attribute float distanceFromRoot;
  uniform float uTime; uniform vec3 uPulsePositions[3]; uniform float uPulseTimes[3]; uniform float uPulseSpeed; uniform float uBaseNodeSize;
  varying vec3 vColor; varying float vNodeType; varying vec3 vPosition; varying float vPulseIntensity; varying float vDistanceFromRoot; varying float vGlow;
  float getPulseIntensity(vec3 worldPos, vec3 pulsePos, float pulseTime){
    if(pulseTime<0.0)return 0.0; float t=uTime-pulseTime; if(t<0.0||t>4.0)return 0.0;
    float pr=t*uPulseSpeed; float d=distance(worldPos,pulsePos); float wp=abs(d-pr);
    return smoothstep(3.0,0.0,wp)*smoothstep(4.0,0.0,t);
  }
  void main(){
    vNodeType=nodeType; vColor=nodeColor; vDistanceFromRoot=distanceFromRoot;
    vec3 worldPos=(modelMatrix*vec4(position,1.0)).xyz; vPosition=worldPos;
    float tot=0.0; for(int i=0;i<3;i++){tot+=getPulseIntensity(worldPos,uPulsePositions[i],uPulseTimes[i]);}
    vPulseIntensity=min(tot,1.0);
    float breathe=sin(uTime*0.7+distanceFromRoot*0.15)*0.15+0.85;
    float baseSize=nodeSize*breathe; float pulseSize=baseSize*(1.0+vPulseIntensity*2.5);
    vGlow=0.5+0.5*sin(uTime*0.5+distanceFromRoot*0.2);
    vec3 mp=position;
    if(nodeType>0.5){ float n=snoise(position*0.08+uTime*0.08); mp+=normalize(position+0.001)*n*0.15; }
    vec4 mvPosition=modelViewMatrix*vec4(mp,1.0);
    gl_PointSize=pulseSize*uBaseNodeSize*(1000.0/-mvPosition.z);
    gl_Position=projectionMatrix*mvPosition;
  }`,
  fragmentShader: `
  uniform float uTime; uniform vec3 uPulseColors[3];
  varying vec3 vColor; varying float vNodeType; varying vec3 vPosition; varying float vPulseIntensity; varying float vDistanceFromRoot; varying float vGlow;
  void main(){
    vec2 c=2.0*gl_PointCoord-1.0; float dist=length(c); if(dist>1.0)discard;
    float glow1=1.0-smoothstep(0.0,0.5,dist); float glow2=1.0-smoothstep(0.0,1.0,dist);
    float gs=pow(glow1,1.2)+glow2*0.3;
    float bc=0.9+0.1*sin(uTime*0.6+vDistanceFromRoot*0.25);
    vec3 baseColor=vColor*bc; vec3 finalColor=baseColor;
    if(vPulseIntensity>0.0){ vec3 pc=mix(vec3(1.0),uPulseColors[0],0.4); finalColor=mix(baseColor,pc,vPulseIntensity*0.8); finalColor*=(1.0+vPulseIntensity*1.2); gs*=(1.0+vPulseIntensity); }
    float core=smoothstep(0.4,0.0,dist); finalColor+=vec3(1.0)*core*0.3;
    float alpha=gs*(0.95-0.3*dist);
    float cd=length(vPosition-cameraPosition); float df=smoothstep(120.0,15.0,cd);
    if(vNodeType>0.5){ finalColor*=1.1; alpha*=0.9; }
    finalColor*=(1.0+vGlow*0.1);
    gl_FragColor=vec4(finalColor,alpha*df);
  }`,
};

const connectionShader = {
  vertexShader: `${noiseFunctions}
  attribute vec3 startPoint; attribute vec3 endPoint; attribute float connectionStrength; attribute float pathIndex; attribute vec3 connectionColor;
  uniform float uTime; uniform vec3 uPulsePositions[3]; uniform float uPulseTimes[3]; uniform float uPulseSpeed;
  varying vec3 vColor; varying float vConnectionStrength; varying float vPulseIntensity; varying float vPathPosition; varying float vDistanceFromCamera;
  float getPulseIntensity(vec3 worldPos, vec3 pulsePos, float pulseTime){
    if(pulseTime<0.0)return 0.0; float t=uTime-pulseTime; if(t<0.0||t>4.0)return 0.0;
    float pr=t*uPulseSpeed; float d=distance(worldPos,pulsePos); float wp=abs(d-pr);
    return smoothstep(3.0,0.0,wp)*smoothstep(4.0,0.0,t);
  }
  void main(){
    float t=position.x; vPathPosition=t;
    vec3 midPoint=mix(startPoint,endPoint,0.5);
    float pathOffset=sin(t*3.14159)*0.15;
    vec3 perpendicular=normalize(cross(normalize(endPoint-startPoint),vec3(0.0,1.0,0.0)));
    if(length(perpendicular)<0.1)perpendicular=vec3(1.0,0.0,0.0);
    midPoint+=perpendicular*pathOffset;
    vec3 p0=mix(startPoint,midPoint,t); vec3 p1=mix(midPoint,endPoint,t); vec3 finalPos=mix(p0,p1,t);
    float noise=snoise(vec3(pathIndex*0.08,t*0.6,uTime*0.15)); finalPos+=perpendicular*noise*0.12;
    vec3 worldPos=(modelMatrix*vec4(finalPos,1.0)).xyz;
    float tot=0.0; for(int i=0;i<3;i++){tot+=getPulseIntensity(worldPos,uPulsePositions[i],uPulseTimes[i]);}
    vPulseIntensity=min(tot,1.0);
    vColor=connectionColor; vConnectionStrength=connectionStrength;
    vDistanceFromCamera=length(worldPos-cameraPosition);
    gl_Position=projectionMatrix*modelViewMatrix*vec4(finalPos,1.0);
  }`,
  fragmentShader: `
  uniform float uTime; uniform vec3 uPulseColors[3];
  varying vec3 vColor; varying float vConnectionStrength; varying float vPulseIntensity; varying float vPathPosition; varying float vDistanceFromCamera;
  void main(){
    float f1=sin(vPathPosition*25.0-uTime*4.0)*0.5+0.5;
    float f2=sin(vPathPosition*15.0-uTime*2.5+1.57)*0.5+0.5;
    float flow=(f1+f2*0.5)/1.5;
    vec3 baseColor=vColor*(0.8+0.2*sin(uTime*0.6+vPathPosition*12.0));
    float fi=0.4*flow*vConnectionStrength; vec3 finalColor=baseColor;
    if(vPulseIntensity>0.0){ vec3 pc=mix(vec3(1.0),uPulseColors[0],0.3); finalColor=mix(baseColor,pc*1.2,vPulseIntensity*0.7); fi+=vPulseIntensity*0.8; }
    finalColor*=(0.7+fi+vConnectionStrength*0.5);
    float alpha=0.7*vConnectionStrength+flow*0.3;
    alpha=mix(alpha,min(1.0,alpha*2.5),vPulseIntensity);
    float df=smoothstep(120.0,15.0,vDistanceFromCamera);
    gl_FragColor=vec4(finalColor,alpha*df);
  }`,
};

function makePulseUniforms() {
  return {
    uTime: { value: 0 },
    uPulsePositions: {
      value: [
        new THREE.Vector3(1e3, 1e3, 1e3),
        new THREE.Vector3(1e3, 1e3, 1e3),
        new THREE.Vector3(1e3, 1e3, 1e3),
      ],
    },
    uPulseTimes: { value: [-1e3, -1e3, -1e3] },
    uPulseColors: {
      value: [new THREE.Color(1, 1, 1), new THREE.Color(1, 1, 1), new THREE.Color(1, 1, 1)],
    },
    uPulseSpeed: { value: 16 },
    uBaseNodeSize: { value: 0.6 },
  };
}

function starfield() {
  const count = 6000;
  const positions: number[] = [];
  const colors: number[] = [];
  const sizes: number[] = [];
  for (let i = 0; i < count; i++) {
    const r = THREE.MathUtils.randFloat(60, 160);
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
    const theta = THREE.MathUtils.randFloat(0, Math.PI * 2);
    positions.push(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi),
    );
    const k = Math.random();
    if (k < 0.7) colors.push(1, 1, 1);
    else if (k < 0.85) colors.push(0.7, 0.8, 1);
    else colors.push(1, 0.9, 0.8);
    sizes.push(THREE.MathUtils.randFloat(0.1, 0.3));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute("size", new THREE.Float32BufferAttribute(sizes, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `attribute float size; attribute vec3 color; varying vec3 vColor; uniform float uTime;
      void main(){ vColor=color; vec4 mv=modelViewMatrix*vec4(position,1.0);
      float tw=sin(uTime*2.0+position.x*100.0)*0.3+0.7; gl_PointSize=size*tw*(300.0/-mv.z); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `varying vec3 vColor; void main(){ vec2 c=gl_PointCoord-0.5; float d=length(c); if(d>0.5)discard;
      float a=1.0-smoothstep(0.0,0.5,d); gl_FragColor=vec4(vColor,a*0.45); }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Points(geo, mat);
}

interface SceneRefs {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  raycaster: THREE.Raycaster;
  nodesMesh: THREE.Points | null;
  connMesh: THREE.LineSegments | null;
  records: Node3D[];
  raf: number;
  paused: boolean;
  desired: { target: THREE.Vector3; cam: THREE.Vector3; until: number } | null;
}

export const NeuralGraph3D = forwardRef<
  NeuralGraph3DHandle,
  {
    graph: { nodes: GraphNode[]; edges: GraphEdge[] };
    onSelect: (id: string) => void;
  }
>(function NeuralGraph3D({ graph, onSelect }, ref) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sref = useRef<SceneRefs | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const focusRef = useRef<(id: string) => void>(() => {});
  const theme = 0; // fixed brand palette (Lime)
  const [paused, setPaused] = useState(false);

  useImperativeHandle(ref, () => ({ focus: (id) => focusRef.current(id) }), []);

  // --- one-time scene setup ---
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const w = mount.clientWidth || 1;
    const h = mount.clientHeight || 1;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.0018);
    const camera = new THREE.PerspectiveCamera(65, w / h, 0.1, 1000);
    camera.position.set(0, 8, 34);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000); // pure black (bloom + stars otherwise read as gray)
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.display = "block";
    mount.appendChild(renderer.domElement);

    const stars = starfield();
    scene.add(stars);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.6;
    controls.minDistance = 6;
    controls.maxDistance = 120;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.25;
    controls.enablePan = false;

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 1.6, 0.6, 0.7);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    const raycaster = new THREE.Raycaster();
    raycaster.params.Points = { threshold: 1.6 };

    sref.current = {
      renderer, scene, camera, controls, composer, bloom, raycaster,
      nodesMesh: null, connMesh: null, records: [], raf: 0, paused: false, desired: null,
    };

    const clock = new THREE.Clock();
    const animate = () => {
      const s = sref.current;
      if (!s) return;
      s.raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      if (!s.paused) {
        if (s.nodesMesh) {
          (s.nodesMesh.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
          s.nodesMesh.rotation.y = Math.sin(t * 0.04) * 0.05;
        }
        if (s.connMesh) {
          (s.connMesh.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
          s.connMesh.rotation.y = Math.sin(t * 0.04) * 0.05;
        }
      }
      if (s.desired) {
        s.controls.target.lerp(s.desired.target, 0.08);
        s.camera.position.lerp(s.desired.cam, 0.08);
        if (t > s.desired.until) {
          s.desired = null;
          if (!s.paused) s.controls.autoRotate = true;
        }
      }
      stars.rotation.y += 0.0002;
      (stars.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
      s.controls.update();
      s.composer.render();
    };

    // pointer: distinguish click from drag, pick a node or fire a pulse
    let downX = 0, downY = 0, lastPulse = 0;
    const onDown = (e: PointerEvent) => { downX = e.clientX; downY = e.clientY; };
    const onUp = (e: PointerEvent) => {
      const s = sref.current;
      if (!s) return;
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return; // drag
      const rect = renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      s.raycaster.setFromCamera(ndc, s.camera);
      if (s.nodesMesh) {
        const hits = s.raycaster.intersectObject(s.nodesMesh);
        if (hits.length && hits[0].index != null) {
          const rec = s.records[hits[0].index];
          if (rec) { focusNode(rec.id); onSelectRef.current(rec.id); return; }
        }
      }
      // no node hit → ripple pulse on a plane facing the camera
      const plane = new THREE.Plane(s.camera.position.clone().normalize(), 0);
      plane.constant = -plane.normal.dot(s.camera.position) + s.camera.position.length() * 0.5;
      const pt = new THREE.Vector3();
      if (s.raycaster.ray.intersectPlane(plane, pt)) {
        const tm = clock.getElapsedTime();
        lastPulse = (lastPulse + 1) % 3;
        for (const m of [s.nodesMesh, s.connMesh]) {
          if (!m) continue;
          const u = (m.material as THREE.ShaderMaterial).uniforms;
          u.uPulsePositions.value[lastPulse].copy(pt);
          u.uPulseTimes.value[lastPulse] = tm;
        }
      }
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);

    function focusNode(id: string) {
      const s = sref.current;
      if (!s) return;
      const rec = s.records.find((r) => r.id === id);
      if (!rec) return;
      const p = new THREE.Vector3(rec.x, rec.y, rec.z);
      const dir = s.camera.position.clone().sub(s.controls.target).normalize();
      s.desired = {
        target: p.clone(),
        cam: p.clone().add(dir.multiplyScalar(16)),
        until: clock.getElapsedTime() + 1.2,
      };
      s.controls.autoRotate = false;
    }
    focusRef.current = focusNode;

    const ro = new ResizeObserver(() => {
      const s = sref.current;
      if (!s || !mount.clientWidth) return;
      s.camera.aspect = mount.clientWidth / mount.clientHeight;
      s.camera.updateProjectionMatrix();
      s.renderer.setSize(mount.clientWidth, mount.clientHeight);
      s.composer.setSize(mount.clientWidth, mount.clientHeight);
      s.bloom.resolution.set(mount.clientWidth, mount.clientHeight);
    });
    ro.observe(mount);

    animate();

    return () => {
      const s = sref.current;
      cancelAnimationFrame(s?.raf ?? 0);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      if (s?.nodesMesh) { s.nodesMesh.geometry.dispose(); (s.nodesMesh.material as THREE.Material).dispose(); }
      if (s?.connMesh) { s.connMesh.geometry.dispose(); (s.connMesh.material as THREE.Material).dispose(); }
      stars.geometry.dispose();
      (stars.material as THREE.Material).dispose();
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      sref.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // mirror paused → animation + autorotate
  useEffect(() => {
    const s = sref.current;
    if (s) { s.paused = paused; s.controls.autoRotate = !paused && !s.desired; }
  }, [paused]);

  // --- (re)build meshes when data or theme changes ---
  useEffect(() => {
    const s = sref.current;
    if (!s) return;
    const { nodes, conns } = layout3d(graph);
    s.records = nodes;
    const palette = THEMES[theme];

    // dispose previous meshes
    if (s.nodesMesh) { s.scene.remove(s.nodesMesh); s.nodesMesh.geometry.dispose(); (s.nodesMesh.material as THREE.Material).dispose(); s.nodesMesh = null; }
    if (s.connMesh) { s.scene.remove(s.connMesh); s.connMesh.geometry.dispose(); (s.connMesh.material as THREE.Material).dispose(); s.connMesh = null; }
    if (nodes.length === 0) return;

    // node buffers
    const np: number[] = [], nt: number[] = [], ns: number[] = [], nc: number[] = [], nd: number[] = [];
    const colorOf = (type: EntityType) => new THREE.Color(palette.colors[type]);
    nodes.forEach((n) => {
      np.push(n.x, n.y, n.z);
      nt.push(n.leaf ? 1 : 0);
      ns.push(n.size);
      nd.push(n.level);
      const c = colorOf(n.type).offsetHSL(
        THREE.MathUtils.randFloatSpread(0.02),
        THREE.MathUtils.randFloatSpread(0.06),
        THREE.MathUtils.randFloatSpread(0.08),
      );
      nc.push(c.r, c.g, c.b);
    });
    const ng = new THREE.BufferGeometry();
    ng.setAttribute("position", new THREE.Float32BufferAttribute(np, 3));
    ng.setAttribute("nodeType", new THREE.Float32BufferAttribute(nt, 1));
    ng.setAttribute("nodeSize", new THREE.Float32BufferAttribute(ns, 1));
    ng.setAttribute("nodeColor", new THREE.Float32BufferAttribute(nc, 3));
    ng.setAttribute("distanceFromRoot", new THREE.Float32BufferAttribute(nd, 1));
    const nodeUniforms = makePulseUniforms();
    palette.pulse.forEach((c, i) => { if (i < 3) nodeUniforms.uPulseColors.value[i].set(c); });
    const nMat = new THREE.ShaderMaterial({
      uniforms: nodeUniforms,
      vertexShader: nodeShader.vertexShader,
      fragmentShader: nodeShader.fragmentShader,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    s.nodesMesh = new THREE.Points(ng, nMat);
    s.scene.add(s.nodesMesh);

    // connection buffers — 20-point curves rendered as additive line segments
    const pos: number[] = [], sp: number[] = [], ep: number[] = [], cs: number[] = [], cc: number[] = [], pi: number[] = [];
    const byId = new Map(nodes.map((n) => [n.id, n]));
    let path = 0;
    for (const conn of conns) {
      const a = byId.get(conn.source), b = byId.get(conn.target);
      if (!a || !b) continue;
      const col = colorOf(a.type);
      const seg = 20;
      for (let i = 0; i < seg; i++) {
        pos.push(i / (seg - 1), 0, 0);
        sp.push(a.x, a.y, a.z);
        ep.push(b.x, b.y, b.z);
        pi.push(path);
        cs.push(conn.strength);
        cc.push(col.r, col.g, col.b);
      }
      path++;
    }
    const cg = new THREE.BufferGeometry();
    cg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    cg.setAttribute("startPoint", new THREE.Float32BufferAttribute(sp, 3));
    cg.setAttribute("endPoint", new THREE.Float32BufferAttribute(ep, 3));
    cg.setAttribute("connectionStrength", new THREE.Float32BufferAttribute(cs, 1));
    cg.setAttribute("connectionColor", new THREE.Float32BufferAttribute(cc, 3));
    cg.setAttribute("pathIndex", new THREE.Float32BufferAttribute(pi, 1));
    const cUniforms = makePulseUniforms();
    palette.pulse.forEach((c, i) => { if (i < 3) cUniforms.uPulseColors.value[i].set(c); });
    const cMat = new THREE.ShaderMaterial({
      uniforms: cUniforms,
      vertexShader: connectionShader.vertexShader,
      fragmentShader: connectionShader.fragmentShader,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    s.connMesh = new THREE.LineSegments(cg, cMat);
    s.scene.add(s.connMesh);
  }, [graph, theme]);

  const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <div ref={mountRef} className="absolute inset-0" />

      {/* instructions */}
      <div className="pointer-events-none absolute left-4 top-4 z-10 w-64 rounded-2xl border border-border bg-surface p-4 backdrop-blur-xl">
        <div className="mb-1 font-display text-sm font-semibold text-fg">Neural Graph</div>
        <p className="text-xs leading-relaxed text-fg-muted">
          Each agent is a hub; snapshots chain outward, audit logs orbit as
          synapses. Drag to rotate, scroll to zoom, click a node to inspect, or
          click empty space to ripple a pulse.
        </p>
      </div>

      {/* legend */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex gap-3 rounded-xl border border-border bg-surface px-3 py-2 text-[11px] backdrop-blur-xl">
        {(
          [
            ["AgentCard", "Agent"],
            ["StateSnapshot", "Snapshot"],
            ["AuditLog", "Audit"],
          ] as [EntityType, string][]
        ).map(([t, label]) => (
          <span key={t} className="flex items-center gap-1.5 text-fg-muted">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: hex(THEMES[theme].colors[t]), boxShadow: `0 0 8px ${hex(THEMES[theme].colors[t])}` }}
            />
            {label}
          </span>
        ))}
      </div>

      {/* controls */}
      <div className="absolute right-4 top-4 z-10 flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3 backdrop-blur-xl">
        <button
          onClick={() => setPaused((p) => !p)}
          className="rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs text-fg-muted transition hover:text-fg"
        >
          {paused ? "Play" : "Freeze"}
        </button>
        <button
          onClick={() => { const s = sref.current; if (s) { s.controls.reset(); s.camera.position.set(0, 8, 34); } }}
          className="rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs text-fg-muted transition hover:text-fg"
        >
          Reset view
        </button>
      </div>
    </div>
  );
});
