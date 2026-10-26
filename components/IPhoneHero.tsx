"use client";

import React, {
  Suspense,
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import { Canvas, useFrame, useThree, invalidate } from "@react-three/fiber";
import { useGLTF, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import MacDock, { ScreenRect } from "./MacDock";
import EducationWindow from "./EducationWindow";
import SiriAI from "./SiriAI";
import ProjectsFinder from "./ProjectsFinder";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// ============================================================================
// TUNABLE CONSTANTS — iPhone Scene
// ============================================================================
const IPHONE_MODEL_PATH = "/iphone_18.glb";
const WALLPAPER_PATH = "/goldengate.jpg";

// Display mesh bounds (from GLB accessor min/max)
const DISPLAY_HALF_W = 0.03325;
const DISPLAY_HALF_H = 0.0723;
const DISPLAY_Z = 0.00447; // front face Z

// Screen-glass mesh bounds — the outermost visible screen layer.
// The glass is slightly larger than the display with a rounder corner
// (measured from GLB); the wallpaper plane must cover it so no
// contrasting ring shows around the screen edge.
const GLASS_HALF_W = 0.03425;
const GLASS_HALF_H = 0.0733;
const GLASS_CORNER_R = 0.009; // world units, screen-glass corner arcs

// Camera
const CAM_FOV = 28;
const CAM_Z = 0.45;
const CAM_Y = 0;

// iPhone titanium body — near-black, polished, reflective
const FRAME_COLOR = "#232327";
const FRAME_METALNESS = 0.95;
const FRAME_ROUGHNESS = 0.28;
const BACK_GLASS_COLOR = "#1B1B1E";

// Scroll phases
const SCROLL_HEIGHT_VH = 280;

// ============================================================================
// iOS Wallpaper Texture (with Status Bar + Dynamic Island)
// ============================================================================
function createIOSWallpaperTexture(
  imgUrl: string,
  maxAnisotropy: number,
  cornerRadiusFrac: number,
  onReady?: () => void
): { texture: THREE.CanvasTexture; dispose: () => void } {
  const cW = 886;
  const cH = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = cW;
  canvas.height = cH;
  const ctx = canvas.getContext("2d");

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;

  let img: HTMLImageElement | null = null;
  let dx = 0,
    dy = 0,
    dw = 0,
    dh = 0;
  let ticker: ReturnType<typeof setInterval> | null = null;

  // Full redraw of the lock screen. Runs on image load and every 30s to
  // keep the clock live. The cover-fit wallpaper fills the entire canvas,
  // so only a clearRect is needed to preserve the transparent corners.
  const draw = () => {
    if (!ctx || !img || !img.complete || !img.naturalWidth) return;

    ctx.clearRect(0, 0, cW, cH);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // 1. Cover-fit wallpaper
    const imgAspect = img.naturalWidth / img.naturalHeight;
    const canvasAspect = cW / cH;
    if (imgAspect > canvasAspect) {
      dh = cH;
      dw = cH * imgAspect;
      dx = (cW - dw) / 2;
      dy = 0;
    } else {
      dw = cW;
      dh = cW / imgAspect;
      dx = 0;
      dy = (cH - dh) / 2;
    }

    // Rounded corners clip — radius derived from the screen-glass mesh's
    // own corner arcs so the wallpaper curve matches the phone edge exactly
    const cornerR = Math.round(cW * cornerRadiusFrac);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cornerR, 0);
    ctx.lineTo(cW - cornerR, 0);
    ctx.arcTo(cW, 0, cW, cornerR, cornerR);
    ctx.lineTo(cW, cH - cornerR);
    ctx.arcTo(cW, cH, cW - cornerR, cH, cornerR);
    ctx.lineTo(cornerR, cH);
    ctx.arcTo(0, cH, 0, cH - cornerR, cornerR);
    ctx.lineTo(0, cornerR);
    ctx.arcTo(0, 0, cornerR, 0, cornerR);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, dx, dy, dw, dh);

    // Original wallpaper treatment — violet→plum→indigo grade + a diagonal
    // light transition + soft layered glows, all inside the rounded clip so
    // the existing purple wallpaper reads as custom-designed for this device
    const grade = ctx.createLinearGradient(0, 0, 0, cH);
    grade.addColorStop(0, "rgba(88, 56, 176, 0.10)");
    grade.addColorStop(0.5, "rgba(122, 46, 122, 0.13)");
    grade.addColorStop(1, "rgba(16, 12, 44, 0.38)");
    ctx.fillStyle = grade;
    ctx.fillRect(0, 0, cW, cH);

    const diag = ctx.createLinearGradient(cW, 0, cW * 0.25, cH * 0.6);
    diag.addColorStop(0, "rgba(255, 244, 255, 0.09)");
    diag.addColorStop(0.45, "rgba(255, 244, 255, 0)");
    ctx.fillStyle = diag;
    ctx.fillRect(0, 0, cW, cH);

    const magenta = ctx.createRadialGradient(
      cW * 0.2, cH * 0.72, 0,
      cW * 0.2, cH * 0.72, cW * 0.6
    );
    magenta.addColorStop(0, "rgba(196, 62, 148, 0.10)");
    magenta.addColorStop(1, "rgba(196, 62, 148, 0)");
    ctx.fillStyle = magenta;
    ctx.fillRect(0, 0, cW, cH);

    const indigo = ctx.createRadialGradient(
      cW * 0.82, cH * 0.3, 0,
      cW * 0.82, cH * 0.3, cW * 0.65
    );
    indigo.addColorStop(0, "rgba(74, 92, 220, 0.08)");
    indigo.addColorStop(1, "rgba(74, 92, 220, 0)");
    ctx.fillStyle = indigo;
    ctx.fillRect(0, 0, cW, cH);
    ctx.restore();

    // 2. iOS Status Bar — clean: no time, no signal/WiFi/battery icons

    // 3. Dynamic Island — real iPhone 17 Pro size
    //    Screen: 402 × 874 pt (matches this model's aspect exactly).
    //    Island: 20.76 mm wide ≈ 125.4 pt (20.76 / (3 / 460 in) at 460 ppi @3x)
    //    → 125.4 / 402 × 886 ≈ 276 px wide; 37.4 pt tall → 82 px on the canvas
    const diW = 276;
    const diH = 82;
    const diX = (cW - diW) / 2;
    const diY = 20;
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.roundRect(diX, diY, diW, diH, diH / 2);
    ctx.fill();
    // Ultra-subtle top rim blending the island into the display
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(diX + 1, diY + 1, diW - 2, diH - 2, diH / 2);
    ctx.stroke();

    // Common vertical anchor for the status row (island center)
    const baseY = diY + diH / 2;

    // Camera lens inside DI
    ctx.fillStyle = "#0D0D10";
    ctx.beginPath();
    ctx.arc(diX + diW - diH / 2, diY + diH / 2, 10, 0, Math.PI * 2);
    ctx.fill();

    // 3b. DND moon icon — left of island, vertically centered on baseY
    {
      const moonX = 96;      // horizontal center of the moon
      const moonY = baseY;   // same vertical center as the island
      const moonR = 18;      // outer circle radius

      ctx.save();
      ctx.fillStyle = "#ffffff";

      // Draw crescent: full circle clipped by an offset circle to carve out the crescent shape
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
      ctx.fill();

      // Carve out inner circle (offset right+up slightly) to form crescent
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(moonX + moonR * 0.55, moonY - moonR * 0.1, moonR * 0.82, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = "source-over";
      ctx.restore();
    }

    // 4. Cellular signal + battery — premium iOS status cluster, top right,
    //    vertically aligned with the Dynamic Island center

    // Battery (iOS style: rounded outline, green fill, tip nub)
    const battW = 56;
    const battH = 26;
    const battX = cW - 46; // right edge of the battery body
    const bodyX = battX - battW;
    const bodyY = baseY - battH / 2;
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(bodyX + 1.25, bodyY + 1.25, battW - 2.5, battH - 2.5, 8);
    ctx.stroke();
    // Charge fill (green, ~78%)
    ctx.fillStyle = "#34C759";
    ctx.beginPath();
    ctx.roundRect(bodyX + 4.5, bodyY + 4.5, (battW - 9) * 0.78, battH - 9, 5.5);
    ctx.fill();
    // Tip nub
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.beginPath();
    ctx.roundRect(battX + 3.5, baseY - 5, 3.5, 10, 2);
    ctx.fill();

    // Cellular bars — 4 ascending rounded bars, bottom-aligned to the
    // battery's baseline like real iOS (short bars sit on the same floor)
    const barW = 7;
    const barGap = 6;
    const barStep = barW + barGap;
    const barsRight = bodyX - 26;
    const barBottom = bodyY + battH; // shared baseline with the battery
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    for (let i = 0; i < 4; i++) {
      const h = 9 + i * 5.7;
      const x = barsRight - (4 - i) * barStep + barGap;
      ctx.beginPath();
      ctx.roundRect(x, barBottom - h, barW, h, barW / 2);
      ctx.fill();
    }

    // 5. Home indicator at bottom — realistic iOS size/position
    const hiW = 296;   // ≈134 pt scaled to canvas
    const hiH = 11;    // ≈5 pt
    const hiX = (cW - hiW) / 2;
    const hiY = cH - 26;
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.roundRect(hiX, hiY, hiW, hiH, hiH / 2);
    ctx.fill();

    texture.needsUpdate = true;
  };

  if (typeof window !== "undefined") {
    img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = imgUrl;
    img.onload = () => {
      draw();
      if (onReady) onReady();
    };
  }

  return {
    texture,
    dispose: () => {},
  };
}

// ============================================================================
// Camera Controller
// ============================================================================
function CameraController() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, CAM_Y, CAM_Z);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
}

// ============================================================================
// iPhone 3D Model
// ============================================================================
interface IPhoneSceneProps {
  scrollProgressRef: React.MutableRefObject<number>;
  scrollYRef: React.MutableRefObject<number>;
  onModelLoaded: () => void;
  screenRectRef: React.MutableRefObject<ScreenRect | null>;
}

function IPhoneModel({
  scrollProgressRef,
  scrollYRef,
  onModelLoaded,
  screenRectRef,
}: IPhoneSceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const displayMeshRef = useRef<THREE.Mesh | null>(null);
  const wallpaperRef = useRef<THREE.Mesh | null>(null);
  const [isReady, setIsReady] = useState(false);

  const _projVec = useMemo(() => new THREE.Vector3(), []);
  const _projCorners = useMemo(
    () => [
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
    ],
    []
  );

  const { scene } = useGLTF(IPHONE_MODEL_PATH);
  const { size, gl, invalidate: requestFrame } = useThree();
  const maxAnisotropy = gl.capabilities.getMaxAnisotropy();

  // Compute auto-fit scale: phone should fill ~52% viewport width in portrait
  const aspect = size.width / Math.max(1, size.height);
  const vH = 2 * CAM_Z * Math.tan(THREE.MathUtils.degToRad(CAM_FOV / 2));
  const vW = vH * aspect;
  const phoneWorldW = 0.0715; // frame total width
  const phoneWorldH = 0.1496; // frame total height
  const targetFrac = 0.52;
  const fitScale = Math.min(
    (vW * targetFrac) / phoneWorldW,
    (vH * 0.72) / phoneWorldH
  );

  // Model setup
  useEffect(() => {
    if (!scene) return;

    // Style the model materials
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mats = Array.isArray(child.material)
          ? child.material
          : [child.material];
        mats.forEach((mat) => {
          if (!mat) return;
          if (mat.name === "frame_aluminum") {
            mat.color = new THREE.Color(FRAME_COLOR);
            mat.metalness = FRAME_METALNESS;
            mat.roughness = FRAME_ROUGHNESS;
            mat.envMapIntensity = 0.95;
            mat.needsUpdate = true;
          } else if (mat.name === "back_glass") {
            mat.color = new THREE.Color(BACK_GLASS_COLOR);
            mat.metalness = 0.3;
            mat.roughness = 0.25;
            mat.needsUpdate = true;
          } else if (mat.name === "display") {
            // We'll overlay our own texture
            mat.color = new THREE.Color("#000000");
            mat.needsUpdate = true;
          } else if (mat.name === "screen_glass") {
            mat.color = new THREE.Color("#000000");
            mat.transparent = true;
            mat.opacity = 0.18;
            mat.roughness = 0.04;
            mat.metalness = 0.05;
            mat.needsUpdate = true;
          } else if (mat.name === "black") {
            mat.color = new THREE.Color("#050505");
            mat.needsUpdate = true;
          } else if (mat.name === "button") {
            mat.color = new THREE.Color(FRAME_COLOR);
            mat.metalness = 0.8;
            mat.roughness = 0.4;
            mat.needsUpdate = true;
          }
        });
      }
    });

    // Find the display mesh
    const displayNode = scene.getObjectByName("display");
    if (displayNode && displayNode instanceof THREE.Mesh) {
      displayMeshRef.current = displayNode;
    }

    // Add iOS wallpaper plane on top of display
    const displayParent = displayNode?.parent || scene;
    const oldWallpaper = displayParent.getObjectByName("iOSWallpaper");
    if (oldWallpaper) displayParent.remove(oldWallpaper);

    const screenW = GLASS_HALF_W * 2;
    const screenH = GLASS_HALF_H * 2;
    // Corner radius as fraction of the screen width (glass arcs measured from GLB)
    const cornerRadiusFrac = GLASS_CORNER_R / screenW;
    const { texture: wallpaperTexture, dispose: disposeWallpaper } =
      createIOSWallpaperTexture(
        WALLPAPER_PATH,
        maxAnisotropy,
        cornerRadiusFrac,
        () => requestFrame()
      );

    const planeGeo = new THREE.PlaneGeometry(screenW, screenH);
    const planeMat = new THREE.MeshBasicMaterial({
      map: wallpaperTexture,
      toneMapped: false,
      side: THREE.FrontSide,
      // The canvas is alpha-clipped to the rounded corners; respecting alpha
      // cuts the corners out of the plane instead of rendering them opaque
      // black (which poked past the phone's curved edge as square blocks).
      transparent: true,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const wallpaperPlane = new THREE.Mesh(planeGeo, planeMat);
    wallpaperPlane.name = "iOSWallpaper";
    wallpaperPlane.position.set(0, 0, DISPLAY_Z + 0.0003);
    wallpaperPlane.renderOrder = 2;

    displayParent.add(wallpaperPlane);
    wallpaperRef.current = wallpaperPlane;

    // Position group
    const group = groupRef.current;
    if (group) {
      group.scale.setScalar(fitScale);
      group.position.set(0, 0, 0);
      group.rotation.set(0, 0, 0);
    }

    const timer = setTimeout(() => {
      setIsReady(true);
      onModelLoaded();
    }, 0);

    return () => {
      clearTimeout(timer);
      disposeWallpaper();
    };
  }, [scene, onModelLoaded, maxAnisotropy, fitScale, requestFrame]);

  // Frame loop — scroll-driven animation + screen projection
  useFrame(({ camera }) => {
    if (!groupRef.current) return;

    const progress = scrollProgressRef.current;
    const group = groupRef.current;

    // Phase 1 (0–0.15): Phone rises from below
    // Phase 2 (0.15–0.45): Phone rotates to show front, slight tilt
    // Phase 3 (0.45–0.65): Hold state, apps interactable
    // Phase 4 (0.60–0.90): Phone screen expands to ~75% of viewport, then holds

    let posY: number;
    let posZ: number;
    let rotX: number;
    let rotY: number;
    let currentScale: number;

    if (progress <= 0.12) {
      // Rise from below viewport
      const riseT = progress / 0.12;
      const easeT =
        riseT < 0.5
          ? 2 * riseT * riseT
          : 1 - Math.pow(-2 * riseT + 2, 2) / 2;
      posY = THREE.MathUtils.lerp(-vH * 0.55, 0, easeT);
      posZ = 0;
      rotX = THREE.MathUtils.lerp(0.25, 0.08, easeT);
      rotY = THREE.MathUtils.lerp(-0.3, 0, easeT);
      currentScale = fitScale;
    } else if (progress <= 0.40) {
      // Subtle float & front-facing settle
      const settleT = (progress - 0.12) / 0.28;
      const easeT =
        settleT < 0.5
          ? 2 * settleT * settleT
          : 1 - Math.pow(-2 * settleT + 2, 2) / 2;
      posY = THREE.MathUtils.lerp(0, 0.002, easeT);
      posZ = THREE.MathUtils.lerp(0, 0.01, easeT);
      rotX = THREE.MathUtils.lerp(0.08, 0, easeT);
      rotY = 0;
      currentScale = fitScale;
    } else if (progress <= 0.60) {
      // Hold — interactable
      posY = 0.002;
      posZ = 0.01;
      rotX = 0;
      rotY = 0;
      currentScale = fitScale;
    } else {
      // Expand: screen fills viewport
      const expandT = Math.min(
        1,
        Math.max(0, (progress - 0.60) / 0.30)
      );
      const easeT =
        expandT < 0.5
          ? 2 * expandT * expandT
          : 1 - Math.pow(-2 * expandT + 2, 2) / 2;

      // Target scale: stop at ~75% of the viewport view — no fullscreen zoom.
      // Clamp by both axes so the display never fills beyond 75% of the view.
      const targetScale = Math.min(
        (vW * 0.75) / (DISPLAY_HALF_W * 2),
        (vH * 0.75) / (DISPLAY_HALF_H * 2)
      );
      // Target Y: center display in viewport
      const targetY = 0;

      posY = THREE.MathUtils.lerp(0.002, targetY, easeT);
      posZ = THREE.MathUtils.lerp(0.01, 0.02, easeT);
      rotX = 0;
      rotY = 0;
      currentScale = THREE.MathUtils.lerp(fitScale, targetScale, easeT);
    }

    group.position.set(0, posY, posZ);
    group.rotation.set(rotX, rotY, 0);
    group.scale.setScalar(currentScale);

    // ── Project wallpaper (screen-glass bounds) plane corners to CSS coords ──
    const wallpaper = wallpaperRef.current;
    if (wallpaper) {
      wallpaper.updateMatrixWorld(true);

      const hw = GLASS_HALF_W;
      const hh = GLASS_HALF_H;

      const corners = _projCorners;
      corners[0].set(-hw, -hh, 0);
      corners[1].set(hw, -hh, 0);
      corners[2].set(-hw, hh, 0);
      corners[3].set(hw, hh, 0);

      let minX = Infinity,
        maxX = -Infinity;
      let minY = Infinity,
        maxY = -Infinity;

      const canvasW = size.width;
      const canvasH = size.height;

      for (let i = 0; i < 4; i++) {
        _projVec.copy(corners[i]);
        wallpaper.localToWorld(_projVec);
        _projVec.project(camera);

        const sx = (_projVec.x * 0.5 + 0.5) * canvasW;
        const sy = (-_projVec.y * 0.5 + 0.5) * canvasH;

        if (sx < minX) minX = sx;
        if (sx > maxX) maxX = sx;
        if (sy < minY) minY = sy;
        if (sy > maxY) maxY = sy;
      }

      const dockVisible = progress > 0.25 && maxX - minX > 20;

      const sr = screenRectRef.current;
      if (!sr) {
        screenRectRef.current = {
          left: minX,
          top: minY,
          width: maxX - minX,
          height: maxY - minY,
          scale: currentScale / fitScale,
          visible: dockVisible,
        };
      } else {
        sr.left = minX;
        sr.top = minY;
        sr.width = maxX - minX;
        sr.height = maxY - minY;
        sr.scale = currentScale / fitScale;
        sr.visible = dockVisible;
      }
    }
  });

  return (
    <>
      <CameraController />

      <ambientLight intensity={0.7} />
      <directionalLight position={[0, 4, 6]} intensity={1.0} />
      <pointLight position={[0, -1, 3]} color="#4A9EFF" intensity={0.8} distance={10} />
      <directionalLight position={[0, 2, -4]} color="#4A9EFF" intensity={0.6} />

      <group ref={groupRef} dispose={null} visible={isReady}>
        <primitive object={scene} />
      </group>

      <group visible={isReady}>
        <ContactShadows
          position={[0, -phoneWorldH * fitScale * 0.52, 0]}
          opacity={0.45}
          scale={0.4}
          blur={1.8}
          far={0.5}
          resolution={64}
          color="#000000"
        />
      </group>
    </>
  );
}

// ============================================================================
// Window IDs & Order
// ============================================================================
type WindowId = "education" | "siri" | "projects";

// ============================================================================
// IPhoneHero — Main Export
// ============================================================================
// ============================================================================
// iOS Lock-Screen Clock Overlay
// ============================================================================
function IOSClock({
  screenRectRef,
}: {
  screenRectRef: React.MutableRefObject<ScreenRect | null>;
}) {
  const clockRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const [time, setTime] = useState(() => new Date());

  // Tick every second
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Track screen rect each frame
  useEffect(() => {
    const update = () => {
      const el = clockRef.current;
      const sr = screenRectRef.current;
      if (el && sr) {
        const centerX = sr.left + sr.width / 2;
        // Position in the upper-center ~28% from the top of the screen
        const topY = sr.top + sr.height * 0.18;
        el.style.left = `${centerX}px`;
        el.style.top = `${topY}px`;
        el.style.opacity = sr.visible ? "1" : "0";
      }
      rafRef.current = requestAnimationFrame(update);
    };
    rafRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafRef.current);
  }, [screenRectRef]);

  const h12 = time.getHours() % 12 || 12;
  const minutes = time.getMinutes().toString().padStart(2, "0");
  const dayName = time.toLocaleDateString("en-US", { weekday: "short" });
  const month = time.toLocaleDateString("en-US", { month: "short" });
  const day = time.getDate();

  return (
    <div
      ref={clockRef}
      style={{
        position: "absolute",
        transform: "translate(-50%, -50%)",
        zIndex: 16,
        pointerEvents: "none",
        textAlign: "center",
        opacity: 0,
        transition: "opacity 0.4s ease",
        userSelect: "none",
      }}
    >
      {/* Date line */}
      <div
        style={{
          color: "rgba(255,255,255,0.92)",
          fontSize: "clamp(10px, 2vw, 16px)",
          fontWeight: 500,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif',
          letterSpacing: "0.01em",
          marginBottom: "2px",
          textShadow: "0 1px 8px rgba(0,0,0,0.55)",
        }}
      >
        {dayName} {day} {month}
      </div>
      {/* Big time */}
      <div
        style={{
          color: "#ffffff",
          fontSize: "clamp(38px, 9vw, 72px)",
          fontWeight: 700,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif',
          letterSpacing: "-0.025em",
          lineHeight: 1,
          textShadow: "0 2px 24px rgba(0,0,0,0.45)",
        }}
      >
        {h12}:{minutes}
      </div>
    </div>
  );
}

export default function IPhoneHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollProgressRef = useRef(0);
  const scrollYRef = useRef(0);
  const screenRectRef = useRef<ScreenRect | null>(null);

  const [isEducationOpen, setIsEducationOpen] = useState(false);
  const [isSiriOpen, setIsSiriOpen] = useState(false);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);

  const [windowOrder, setWindowOrder] = useState<WindowId[]>([
    "education",
    "siri",
    "projects",
  ]);
  const bringToFront = useCallback((id: WindowId) => {
    setWindowOrder((prev) => [...prev.filter((w) => w !== id), id]);
  }, []);
  const zIndexFor = (id: WindowId) => 11 + windowOrder.indexOf(id);

  useEffect(() => {
    if (isEducationOpen) bringToFront("education");
  }, [isEducationOpen, bringToFront]);
  useEffect(() => {
    if (isSiriOpen) bringToFront("siri");
  }, [isSiriOpen, bringToFront]);
  useEffect(() => {
    if (isProjectsOpen) bringToFront("projects");
  }, [isProjectsOpen, bringToFront]);

  // Mobile demand-driven scroll rendering
  const scrollPumpActiveRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerScrollRender = useCallback(() => {
    invalidate();
    if (!scrollPumpActiveRef.current) {
      scrollPumpActiveRef.current = true;
      requestAnimationFrame(function pump() {
        invalidate();
        if (scrollPumpActiveRef.current) {
          requestAnimationFrame(pump);
        }
      });
    }
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      scrollPumpActiveRef.current = false;
      invalidate();
    }, 120);
  }, []);

  // Scroll listener
  useEffect(() => {
    const onScroll = () => {
      scrollYRef.current = window.scrollY;
      triggerScrollRender();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [triggerScrollRender]);

  const handleModelLoaded = useCallback(() => {
    requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      invalidate();
    });
  }, []);

  // GSAP ScrollTrigger
  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: containerRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: 0,
        onUpdate: (self) => {
          scrollProgressRef.current = self.progress;
          triggerScrollRender();
        },
        refreshPriority: 1,
      });
    }, containerRef.current || undefined);

    return () => {
      ctx.revert();
    };
  }, [triggerScrollRender]);

  return (
    <div
      ref={containerRef}
      className="relative w-full pointer-events-none"
      style={{ height: `${SCROLL_HEIGHT_VH}vh` }}
    >
      <div
        className="fixed inset-0 w-full h-[100dvh] pointer-events-none z-10 overflow-hidden"
        style={{
          background: "transparent",
          contain: "strict",
          transform: "translateZ(0)",
        }}
      >
        <Canvas
          frameloop="demand"
          gl={{
            alpha: true,
            antialias: true,
            powerPreference: "high-performance",
            preserveDrawingBuffer: false,
          }}
          style={{ background: "transparent" }}
          dpr={[1, 2]}
          camera={{
            position: [0, CAM_Y, CAM_Z],
            fov: CAM_FOV,
          }}
        >
          <Suspense fallback={null}>
            <Environment files="/potsdamer_platz_1k.hdr" background={false} />
          </Suspense>
          <Suspense fallback={null}>
            <IPhoneModel
              scrollProgressRef={scrollProgressRef}
              scrollYRef={scrollYRef}
              onModelLoaded={handleModelLoaded}
              screenRectRef={screenRectRef}
            />
          </Suspense>
        </Canvas>

        {/* iOS Lock-Screen Clock */}
        <IOSClock screenRectRef={screenRectRef} />

        {/* iOS-style Dock */}
        <MacDock
          screenRectRef={screenRectRef}
          isMobile={true}
          onOpenEducation={() => setIsEducationOpen((prev) => !prev)}
          isEducationOpen={isEducationOpen}
          onOpenSiri={() => setIsSiriOpen((prev) => !prev)}
          isSiriOpen={isSiriOpen}
          onOpenProjects={() => setIsProjectsOpen((prev) => !prev)}
          isProjectsOpen={isProjectsOpen}
        />

        {/* App Windows */}
        <EducationWindow
          isOpen={isEducationOpen}
          onClose={() => setIsEducationOpen(false)}
          screenRectRef={screenRectRef}
          isMobile={true}
          zIndex={zIndexFor("education")}
          onFocus={() => bringToFront("education")}
        />
        <SiriAI
          isOpen={isSiriOpen}
          onClose={() => setIsSiriOpen(false)}
          screenRectRef={screenRectRef}
          isMobile={true}
          zIndex={zIndexFor("siri")}
          onFocus={() => bringToFront("siri")}
        />
        <ProjectsFinder
          isOpen={isProjectsOpen}
          onClose={() => setIsProjectsOpen(false)}
          screenRectRef={screenRectRef}
          isMobile={true}
          zIndex={zIndexFor("projects")}
          onFocus={() => bringToFront("projects")}
        />
      </div>
    </div>
  );
}
