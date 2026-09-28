"use client";

import React, { Suspense, useEffect, useRef, useState, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { siApple } from "simple-icons";

// Ensure ScrollTrigger is registered once
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// ============================================================================
// TUNABLE CONSTANTS (Auto-fit sizing, camera, text & positioning)
// ============================================================================
export const MAX_W_FRAC = 0.80;          // Open laptop occupies max 80% of viewport width
export const MAX_H_FRAC = 0.82;          // Open laptop occupies max 82% of viewport height
export const CENTER_Y_OFFSET = 0.35;     // Vertical offset to guarantee >= 8% margin top and bottom

export const CAMERA_X = 0;
export const CAMERA_Y = 0.7;             // Raised by +0.4 for natural 3/4 keyboard view
export const CAMERA_Z = 9.2;             // Matched with fov 27 to preserve sizing
export const CAMERA_FOV = 27;            // Reduced perspective distortion (from 35 down to 27)

export const CENTER_ROT_X = 0.08;        // Straight-on front view angle (0.05–0.1)
export const START_ROT_X = 0.22;         // Initial subtle tilt at bottom

export const LID_CLOSED_ROT = Math.PI;   // 180° (closed flat on base)
export const LID_OPEN_ROT = 1.31;        // ~75° local X (~105° natural open display angle)

export const CHIN_TEXT_SIZE = 0.65;      // Height of MacBook Pro chin text plane
export const CHIN_TEXT_Y = -10.55;       // Centered in the black bottom bezel (chin)
export const CHIN_TEXT_COLOR = "#b8b8be";// Crisp Apple anodized silver

export const LOGO_SIZE = 3.46;           // ~11% of lid width (31.48 * 0.11)
export const LOGO_ROT_Z = Math.PI;       // Authentic Apple lid orientation (leaf to top, bite to right)
export const LOGO_Y = -0.854;            // Precise outer surface coordinate of aluminum lid (from raycast)
export const LOGO_Z = -11.0;             // Centered vertically between hinge (Z=0) and opening lip (Z=-21.88)
export const LOGO_COLOR = "#0a0a0c";     // Deep jet black Apple logo
export const LOGO_ROUGHNESS = 0.12;      // Glossy polished finish
export const LOGO_METALNESS = 0.5;       // Subtle obsidian specular reflection

export const SCREEN_MESH_NAME = "matte";
export const LID_NODE_NAME = "screen";
export const BODY_NODE_NAME = "body";
export const MODEL_PATH = "/mac.glb";
export const WALLPAPER_PATH = "/goldengate.jpg";

// Preload 3D model
useGLTF.preload(MODEL_PATH);

interface ModelMeasurements {
  openSize: THREE.Vector3;
  openCenter: THREE.Vector3;
  closedSize: THREE.Vector3;
  closedCenter: THREE.Vector3;
}

interface SceneProps {
  scrollProgressRef: React.MutableRefObject<number>;
  onModelLoaded: () => void;
}

// ============================================================================
// Helper: Draw Apple Logo Texture using simple-icons (Deep Gloss Black)
// ============================================================================
function createAppleLogoTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, 1024, 1024);
    ctx.save();

    // Scale and center the 24x24 icon inside 1024x1024
    const pad = 64;
    const targetSize = 1024 - pad * 2; // 896px
    const scale = targetSize / 24;
    ctx.translate(pad, pad);
    ctx.scale(scale, scale);

    const path = new Path2D(siApple.path);

    // Deep piano black / obsidian gloss gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 24);
    grad.addColorStop(0.0, "#16161a");
    grad.addColorStop(0.35, "#0a0a0c");
    grad.addColorStop(1.0, "#020203");

    ctx.fillStyle = grad;
    ctx.fill(path);

    // Subtle edge chamfer highlight so the black logo is crisply defined on the lid
    ctx.lineWidth = 0.28;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
    ctx.stroke(path);

    ctx.restore();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

// ============================================================================
// Helper: Draw US MacBook Pro Keyboard on a 2048px 2D Canvas
// ============================================================================
function createKeyboardTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 780;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Speaker Grilles (Left and Right narrow vertical strips of micro-dots)
    ctx.fillStyle = "#0a0a0c";
    const dotSpacing = 11;
    const dotRadius = 1.9;

    // Left speaker grille
    for (let gx = 45; gx < 175; gx += dotSpacing) {
      for (let gy = 55; gy < 725; gy += dotSpacing) {
        ctx.beginPath();
        ctx.arc(gx, gy, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Right speaker grille
    for (let gx = canvas.width - 175; gx < canvas.width - 45; gx += dotSpacing) {
      for (let gy = 55; gy < 725; gy += dotSpacing) {
        ctx.beginPath();
        ctx.arc(gx, gy, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 2. Keyboard Key Well (Anodized dark recessed well)
    const wellX = 210;
    const wellY = 35;
    const wellW = canvas.width - 420;
    const wellH = 710;
    const wellR = 14;

    ctx.fillStyle = "#101012";
    ctx.beginPath();
    ctx.roundRect(wellX, wellY, wellW, wellH, wellR);
    ctx.fill();

    // 3. Draw Keys
    const keyGap = 8;
    const padX = 14;
    const padY = 14;
    const innerW = wellW - padX * 2;
    const keyRadius = 7;
    const keyColor = "#1c1c1e";
    const legendColor = "#d1d1d6";

    // Row definitions for US MacBook Pro layout
    // Row 1: Function keys (height ~58px)
    // Rows 2-6: Standard rows (height ~95px)
    const rowHeights = [58, 96, 96, 96, 96, 98];

    interface KeyDef {
      label: string;
      weight: number; // proportional width
      isTouchId?: boolean;
      isArrow?: "up" | "down" | "left" | "right";
    }

    const rows: KeyDef[][] = [
      // Row 1: esc, F1–F12, Touch ID
      [
        { label: "esc", weight: 1.5 },
        { label: "F1", weight: 1 },
        { label: "F2", weight: 1 },
        { label: "F3", weight: 1 },
        { label: "F4", weight: 1 },
        { label: "F5", weight: 1 },
        { label: "F6", weight: 1 },
        { label: "F7", weight: 1 },
        { label: "F8", weight: 1 },
        { label: "F9", weight: 1 },
        { label: "F10", weight: 1 },
        { label: "F11", weight: 1 },
        { label: "F12", weight: 1 },
        { label: "", weight: 1.25, isTouchId: true },
      ],
      // Row 2: Number row
      [
        { label: "`", weight: 1 },
        { label: "1", weight: 1 },
        { label: "2", weight: 1 },
        { label: "3", weight: 1 },
        { label: "4", weight: 1 },
        { label: "5", weight: 1 },
        { label: "6", weight: 1 },
        { label: "7", weight: 1 },
        { label: "8", weight: 1 },
        { label: "9", weight: 1 },
        { label: "0", weight: 1 },
        { label: "-", weight: 1 },
        { label: "=", weight: 1 },
        { label: "delete", weight: 1.65 },
      ],
      // Row 3: Tab QWERTY
      [
        { label: "tab", weight: 1.65 },
        { label: "Q", weight: 1 },
        { label: "W", weight: 1 },
        { label: "E", weight: 1 },
        { label: "R", weight: 1 },
        { label: "T", weight: 1 },
        { label: "Y", weight: 1 },
        { label: "U", weight: 1 },
        { label: "I", weight: 1 },
        { label: "O", weight: 1 },
        { label: "P", weight: 1 },
        { label: "[", weight: 1 },
        { label: "]", weight: 1 },
        { label: "\\", weight: 1 },
      ],
      // Row 4: Caps Lock Home Row
      [
        { label: "caps lock", weight: 1.95 },
        { label: "A", weight: 1 },
        { label: "S", weight: 1 },
        { label: "D", weight: 1 },
        { label: "F", weight: 1 },
        { label: "G", weight: 1 },
        { label: "H", weight: 1 },
        { label: "J", weight: 1 },
        { label: "K", weight: 1 },
        { label: "L", weight: 1 },
        { label: ";", weight: 1 },
        { label: "'", weight: 1 },
        { label: "return", weight: 1.95 },
      ],
      // Row 5: Shift Bottom Row
      [
        { label: "shift", weight: 2.45 },
        { label: "Z", weight: 1 },
        { label: "X", weight: 1 },
        { label: "C", weight: 1 },
        { label: "V", weight: 1 },
        { label: "B", weight: 1 },
        { label: "N", weight: 1 },
        { label: "M", weight: 1 },
        { label: ",", weight: 1 },
        { label: ".", weight: 1 },
        { label: "/", weight: 1 },
        { label: "shift", weight: 2.45 },
      ],
      // Row 6: Modifier row & Inverted-T arrows
      [
        { label: "fn", weight: 1.05 },
        { label: "control", weight: 1.15 },
        { label: "option", weight: 1.25 },
        { label: "command", weight: 1.45 },
        { label: "", weight: 6.2 }, // spacebar
        { label: "command", weight: 1.45 },
        { label: "option", weight: 1.25 },
        { label: "", weight: 1.05, isArrow: "left" },
        { label: "", weight: 1.05, isArrow: "up" }, // stacked up/down
        { label: "", weight: 1.05, isArrow: "right" },
      ],
    ];

    let currentY = wellY + padY;

    rows.forEach((row, rowIndex) => {
      const rowH = rowHeights[rowIndex];
      const totalWeight = row.reduce((acc, k) => acc + k.weight, 0);
      const totalGaps = (row.length - 1) * keyGap;
      const availW = innerW - totalGaps;
      const unitW = availW / totalWeight;

      let currentX = wellX + padX;

      row.forEach((key) => {
        const keyW = key.weight * unitW;

        if (key.isArrow === "up") {
          // Half-height Up Arrow
          const halfH = (rowH - keyGap) / 2;
          ctx.fillStyle = keyColor;
          ctx.beginPath();
          ctx.roundRect(currentX, currentY, keyW, halfH, 5);
          ctx.fill();

          // Up Arrow triangle
          ctx.fillStyle = legendColor;
          ctx.beginPath();
          ctx.moveTo(currentX + keyW / 2, currentY + halfH / 2 - 5);
          ctx.lineTo(currentX + keyW / 2 - 6, currentY + halfH / 2 + 5);
          ctx.lineTo(currentX + keyW / 2 + 6, currentY + halfH / 2 + 5);
          ctx.closePath();
          ctx.fill();

          // Half-height Down Arrow
          const downY = currentY + halfH + keyGap;
          ctx.fillStyle = keyColor;
          ctx.beginPath();
          ctx.roundRect(currentX, downY, keyW, halfH, 5);
          ctx.fill();

          // Down Arrow triangle
          ctx.fillStyle = legendColor;
          ctx.beginPath();
          ctx.moveTo(currentX + keyW / 2, downY + halfH / 2 + 5);
          ctx.lineTo(currentX + keyW / 2 - 6, downY + halfH / 2 - 5);
          ctx.lineTo(currentX + keyW / 2 + 6, downY + halfH / 2 - 5);
          ctx.closePath();
          ctx.fill();
        } else {
          // Standard Key
          ctx.fillStyle = keyColor;
          ctx.beginPath();
          ctx.roundRect(currentX, currentY, keyW, rowH, keyRadius);
          ctx.fill();

          if (key.isTouchId) {
            // Touch ID button
            ctx.fillStyle = "#121214";
            ctx.beginPath();
            ctx.roundRect(currentX + 6, currentY + 6, keyW - 12, rowH - 12, 6);
            ctx.fill();
            ctx.strokeStyle = "#2c2c2e";
            ctx.lineWidth = 1.5;
            ctx.stroke();
          } else if (key.isArrow === "left") {
            // Left Arrow
            const halfH = (rowH - keyGap) / 2;
            const arrowY = currentY + halfH + keyGap; // aligned with down arrow
            ctx.fillStyle = keyColor;
            ctx.beginPath();
            ctx.roundRect(currentX, arrowY, keyW, halfH, 5);
            ctx.fill();

            ctx.fillStyle = legendColor;
            ctx.beginPath();
            ctx.moveTo(currentX + keyW / 2 - 5, arrowY + halfH / 2);
            ctx.lineTo(currentX + keyW / 2 + 5, arrowY + halfH / 2 - 6);
            ctx.lineTo(currentX + keyW / 2 + 5, arrowY + halfH / 2 + 6);
            ctx.closePath();
            ctx.fill();
          } else if (key.isArrow === "right") {
            // Right Arrow
            const halfH = (rowH - keyGap) / 2;
            const arrowY = currentY + halfH + keyGap;
            ctx.fillStyle = keyColor;
            ctx.beginPath();
            ctx.roundRect(currentX, arrowY, keyW, halfH, 5);
            ctx.fill();

            ctx.fillStyle = legendColor;
            ctx.beginPath();
            ctx.moveTo(currentX + keyW / 2 + 5, arrowY + halfH / 2);
            ctx.lineTo(currentX + keyW / 2 - 5, arrowY + halfH / 2 - 6);
            ctx.lineTo(currentX + keyW / 2 - 5, arrowY + halfH / 2 + 6);
            ctx.closePath();
            ctx.fill();
          } else if (key.label) {
            // Text legend
            ctx.fillStyle = legendColor;
            const fontSize = rowIndex === 0 ? 19 : key.label.length > 2 ? 17 : 24;
            ctx.font = `500 ${fontSize}px -apple-system, "SF Pro Text", Inter, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            if (key.label === "caps lock" || key.label === "tab" || key.label === "shift") {
              ctx.textAlign = "left";
              ctx.fillText(key.label, currentX + 12, currentY + rowH / 2);
            } else if (key.label === "return" || key.label === "delete") {
              ctx.textAlign = "right";
              ctx.fillText(key.label, currentX + keyW - 12, currentY + rowH / 2);
            } else {
              ctx.fillText(key.label, currentX + keyW / 2, currentY + rowH / 2);
            }
          }
        }

        currentX += keyW + keyGap;
      });

      currentY += rowH + keyGap;
    });
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

// ============================================================================
// Helper: Draw Wallpaper with Cover Fit, macOS Menu Bar & Notch
// ============================================================================
function createMacOSWallpaperTexture(imgUrl: string, onReady: () => void): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 2560;
  canvas.height = 1600;
  const ctx = canvas.getContext("2d");

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  if (typeof window !== "undefined") {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = imgUrl;
    img.onload = () => {
      if (!ctx) return;

      // 1. Cover fit calculation
      const imgAspect = img.width / img.height;
      const canvasAspect = canvas.width / canvas.height;
      let dw: number, dh: number, dx: number, dy: number;

      if (imgAspect > canvasAspect) {
        dh = canvas.height;
        dw = canvas.height * imgAspect;
        dx = (canvas.width - dw) / 2;
        dy = 0;
      } else {
        dw = canvas.width;
        dh = canvas.width / imgAspect;
        dx = 0;
        dy = (canvas.height - dh) / 2;
      }
      // Fill canvas background with solid black bezel
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Clip wallpaper to rounded top corners (Apple Liquid Retina display style)
      const topCornerRadius = 38;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, topCornerRadius);
      ctx.arcTo(0, 0, topCornerRadius, 0, topCornerRadius); // Top-left rounded
      ctx.lineTo(canvas.width - topCornerRadius, 0);
      ctx.arcTo(canvas.width, 0, canvas.width, topCornerRadius, topCornerRadius); // Top-right rounded
      ctx.lineTo(canvas.width, canvas.height); // Bottom-right 90° square
      ctx.lineTo(0, canvas.height); // Bottom-left 90° square
      ctx.closePath();
      ctx.clip();

      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();

      // 2. Transparent macOS-style Menu Bar
      const barH = 56;

      // Left items: Apple logo, Dharmik, Menus
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      ctx.font = '500 24px -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif';
      ctx.fillText("", 36, barH / 2);

      ctx.font = '700 24px -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif';
      ctx.fillText("Dharmik", 74, barH / 2);

      ctx.font = '400 23px -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif';
      ctx.fillStyle = "rgba(255, 255, 255, 0.90)";
      const menus = ["File", "Edit", "View", "Window", "Help"];
      let menuX = 205;
      for (const m of menus) {
        ctx.fillText(m, menuX, barH / 2);
        menuX += ctx.measureText(m).width + 30;
      }

      // Right items: Date & Time
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      const dateStr = now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
      const fullTimeStr = `${dateStr}  ${timeStr}`;

      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
      ctx.fillText(fullTimeStr, canvas.width - 40, barH / 2);

      // 3. Black rounded-bottom notch in the top center (widened notch ~12% width)
      const notchW = canvas.width * 0.12; // ~307px
      const notchH = 76;
      const notchR = 18;
      const notchX = (canvas.width - notchW) / 2;

      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.moveTo(notchX, 0);
      ctx.lineTo(notchX, notchH - notchR);
      ctx.quadraticCurveTo(notchX, notchH, notchX + notchR, notchH);
      ctx.lineTo(notchX + notchW - notchR, notchH);
      ctx.quadraticCurveTo(notchX + notchW, notchH, notchX + notchW, notchH - notchR);
      ctx.lineTo(notchX + notchW, 0);
      ctx.closePath();
      ctx.fill();

      // Camera lens dot inside notch
      ctx.fillStyle = "#080e1a";
      ctx.beginPath();
      ctx.arc(canvas.width / 2, notchH * 0.45, 7.5, 0, Math.PI * 2);
      ctx.fill();

      texture.needsUpdate = true;
      onReady();
    };
  }

  return texture;
}

// Helper: macOS Buffer Spinner Texture
function createSpinnerTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const count = 12;
    const innerR = 45;
    const outerR = 90;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const alpha = 0.12 + (i / count) * 0.88;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 14;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(innerR, 0);
      ctx.lineTo(outerR, 0);
      ctx.stroke();
      ctx.restore();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 16;
  texture.needsUpdate = true;
  return texture;
}

// Helper: 'Coming Soon' Frosted Glass Badge Texture
function createComingSoonTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1120;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const pad = 12;
    const w = canvas.width - pad * 2;
    const h = canvas.height - pad * 2;
    const r = h / 2;

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
    ctx.shadowBlur = 36;
    ctx.shadowOffsetY = 10;

    ctx.fillStyle = "rgba(12, 12, 16, 0.62)";
    ctx.beginPath();
    ctx.roundRect(pad, pad, w, h, r);
    ctx.fill();

    ctx.shadowColor = "transparent";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
    ctx.lineWidth = 3.5;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = '600 76px -apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif';
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.letterSpacing = "0.04em";
    // Positioned with comfortable spacing after the spinner
    ctx.fillText("Coming Soon", 312, canvas.height / 2);
    ctx.restore();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 16;
  texture.needsUpdate = true;
  return texture;
}

function CameraController() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(CAMERA_X, CAMERA_Y, CAMERA_Z);
    camera.lookAt(0, CAMERA_Y - 0.5, 0);
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
}

function MacbookModel({ scrollProgressRef, onModelLoaded }: SceneProps) {
  const laptopGroupRef = useRef<THREE.Group>(null);
  const lidNodeRef = useRef<THREE.Object3D | null>(null);
  const shadowGroupRef = useRef<THREE.Group>(null);
  const screenLightRef = useRef<THREE.PointLight>(null);
  const spinnerRef = useRef<THREE.Mesh>(null);

  const [measurements, setMeasurements] = useState<ModelMeasurements | null>(null);

  const { scene } = useGLTF(MODEL_PATH);
  const { size } = useThree();

  const aspect = size.width / Math.max(1, size.height);
  const H = 2 * CAMERA_Z * Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2));
  const W = H * aspect;

  // Auto-fit scale using OPEN laptop measurements
  const scale = useMemo(() => {
    if (!measurements) return 0.14;
    return Math.min(
      (W * MAX_W_FRAC) / measurements.openSize.x,
      (H * MAX_H_FRAC) / measurements.openSize.y
    );
  }, [measurements, W, H]);

  // Model preparation: Measure poses, add keyboard deck, Apple logo, display & chin
  useEffect(() => {
    if (!scene || !laptopGroupRef.current) return;

    // Log GLB mesh and material names
    console.log("=== [MacBook 3D Model GLB Inspection] ===");
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material;
        const matNames = Array.isArray(mat)
          ? mat.map((m) => m.name).join(", ")
          : mat?.name;
        console.log(`• Mesh: "${child.name}" | Material: "${matNames}"`);
      } else {
        console.log(`• Node: "${child.name}" (${child.type})`);
      }
    });
    console.log("=========================================");

    const lidNode = scene.getObjectByName(LID_NODE_NAME);
    const bodyNode = scene.getObjectByName(BODY_NODE_NAME);
    const group = laptopGroupRef.current;

    // 1. Measure open & closed pose
    if (lidNode) {
      lidNode.rotation.x = LID_OPEN_ROT;
      group.position.set(0, 0, 0);
      group.rotation.set(CENTER_ROT_X, 0, 0);
      group.scale.set(1, 1, 1);
      group.updateMatrixWorld(true);

      const openBox = new THREE.Box3().setFromObject(group);
      const openSize = new THREE.Vector3();
      openBox.getSize(openSize);
      const openCenter = new THREE.Vector3();
      openBox.getCenter(openCenter);

      lidNode.rotation.x = LID_CLOSED_ROT;
      group.updateMatrixWorld(true);

      const closedBox = new THREE.Box3().setFromObject(group);
      const closedSize = new THREE.Vector3();
      closedBox.getSize(closedSize);
      const closedCenter = new THREE.Vector3();
      closedBox.getCenter(closedCenter);

      setMeasurements({
        openSize,
        openCenter,
        closedSize,
        closedCenter,
      });

      lidNodeRef.current = lidNode;
    }

    // 2. Keyboard on the deck (88% of deck width, starting below hinge)
    if (bodyNode) {
      const oldKb = bodyNode.getObjectByName("keyboardDeckPlane");
      if (oldKb) bodyNode.remove(oldKb);

      const kbTexture = createKeyboardTexture();
      const kbWidth = 27.7;
      const kbDepth = 10.5;
      const kbGeo = new THREE.PlaneGeometry(kbWidth, kbDepth);
      const kbMat = new THREE.MeshStandardMaterial({
        map: kbTexture,
        transparent: true,
        roughness: 0.85,
        metalness: 0.1,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      const kbMesh = new THREE.Mesh(kbGeo, kbMat);
      kbMesh.name = "keyboardDeckPlane";
      kbMesh.rotation.x = -Math.PI / 2;
      // y = deckTop (0.033) + 0.001, z centered between hinge and trackpad
      kbMesh.position.set(0, 0.034, -5.8);
      bodyNode.add(kbMesh);
    }

    // 3. Apple logo on the outer (back) face of the lid
    if (lidNode) {
      const oldLogo = lidNode.getObjectByName("appleLidLogo");
      if (oldLogo) lidNode.remove(oldLogo);

      const appleTexture = createAppleLogoTexture();
      const logoGeo = new THREE.PlaneGeometry(LOGO_SIZE, LOGO_SIZE);
      const logoMat = new THREE.MeshStandardMaterial({
        map: appleTexture,
        transparent: true,
        roughness: LOGO_ROUGHNESS,
        metalness: LOGO_METALNESS,
        color: "#ffffff",
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const logoMesh = new THREE.Mesh(logoGeo, logoMat);
      logoMesh.name = "appleLidLogo";
      logoMesh.renderOrder = 10;
      // Positioned precisely on the outer back surface of the aluminum lid
      logoMesh.rotation.set(Math.PI / 2, 0, LOGO_ROT_Z);
      logoMesh.position.set(0, LOGO_Y, LOGO_Z);
      lidNode.add(logoMesh);
    }

    // 4. Wallpaper display plane with macOS menu bar + glossy glass overlay
    if (lidNode) {
      const oldDisplay = lidNode.getObjectByName("macOSDisplayPlane");
      if (oldDisplay) lidNode.remove(oldDisplay);

      const screenW = 30.375;
      const screenH = 19.627;

      const wallpaperTexture = createMacOSWallpaperTexture(WALLPAPER_PATH, () => {
        ScrollTrigger.refresh();
      });

      const planeGeo = new THREE.PlaneGeometry(screenW, screenH);
      const planeMat = new THREE.MeshBasicMaterial({
        map: wallpaperTexture,
        toneMapped: false,
        side: THREE.DoubleSide,
      });
      const displayPlane = new THREE.Mesh(planeGeo, planeMat);
      displayPlane.name = "macOSDisplayPlane";
      displayPlane.rotation.x = -Math.PI / 2;
      displayPlane.position.set(0, -0.422, -11.522); // 0.001 in front of display surface

      // Subtle glossy glass gradient overlay
      const glassMat = new THREE.MeshStandardMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.05,
        roughness: 0.08,
        metalness: 0.15,
        depthWrite: false,
      });
      const glassPlane = new THREE.Mesh(planeGeo.clone(), glassMat);
      glassPlane.position.set(0, 0, 0.001);
      displayPlane.add(glassPlane);

      // 5. 'MacBook Pro' text on the bottom bezel (chin)
      // 5. 'MacBook Pro' text on the bottom bezel (chin)
      const textCanvas = document.createElement("canvas");
      textCanvas.width = 2048;
      textCanvas.height = 256;
      const textCtx = textCanvas.getContext("2d");
      if (textCtx) {
        textCtx.clearRect(0, 0, textCanvas.width, textCanvas.height);
        textCtx.textAlign = "center";
        textCtx.textBaseline = "middle";
        textCtx.font =
          '600 160px -apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif';
        textCtx.fillStyle = CHIN_TEXT_COLOR;
        textCtx.letterSpacing = "0.08em";
        textCtx.fillText("MacBook Pro", textCanvas.width / 2, textCanvas.height / 2);
      }
      const textTexture = new THREE.CanvasTexture(textCanvas);
      textTexture.colorSpace = THREE.SRGBColorSpace;
      textTexture.anisotropy = 16;
      textTexture.minFilter = THREE.LinearFilter;
      textTexture.magFilter = THREE.LinearFilter;
      textTexture.generateMipmaps = false;
      textTexture.needsUpdate = true;

      const textW = screenW * 0.20; // 20% of screen width
      const textH = CHIN_TEXT_SIZE;
      const textGeo = new THREE.PlaneGeometry(textW, textH);
      const textMat = new THREE.MeshBasicMaterial({
        map: textTexture,
        transparent: true,
        toneMapped: false,
        side: THREE.DoubleSide,
      });
      const textMesh = new THREE.Mesh(textGeo, textMat);
      textMesh.name = "chinTextMesh";
      textMesh.position.set(0, CHIN_TEXT_Y, 0.004);
      displayPlane.add(textMesh);

      // 6. 'Coming Soon' Badge with live animated buffer spinner
      const badgeW = 8.0;
      const badgeH = 1.83;
      const badgeGeo = new THREE.PlaneGeometry(badgeW, badgeH);
      const badgeMat = new THREE.MeshBasicMaterial({
        map: createComingSoonTexture(),
        transparent: true,
        toneMapped: false,
        side: THREE.DoubleSide,
      });
      const badgeMesh = new THREE.Mesh(badgeGeo, badgeMat);
      badgeMesh.name = "comingSoonBadge";
      badgeMesh.position.set(0, 0, 0.003);

      const spinSize = 0.95;
      const spinGeo = new THREE.PlaneGeometry(spinSize, spinSize);
      const spinMat = new THREE.MeshBasicMaterial({
        map: createSpinnerTexture(),
        transparent: true,
        toneMapped: false,
        side: THREE.DoubleSide,
      });
      const spinMesh = new THREE.Mesh(spinGeo, spinMat);
      spinMesh.name = "bufferSpinner";
      spinMesh.position.set(-2.66, 0, 0.001);
      badgeMesh.add(spinMesh);
      spinnerRef.current = spinMesh;

      displayPlane.add(badgeMesh);

      lidNode.add(displayPlane);
    }

    onModelLoaded();
  }, [scene, onModelLoaded]);

  // Frame-by-frame update loop:
  // 1. Sync rise with actual scroll distance (lockstep speed)
  // 2. Keep open laptop visually centered (interpolating from closedCenter to openCenter)
  // 3. Smooth power2.inOut lid opening
  useFrame((_, delta) => {
    // Continuously spin buffer spinner at smooth 60fps
    if (spinnerRef.current) {
      spinnerRef.current.rotation.z -= delta * 4.5;
    }

    if (!measurements || !laptopGroupRef.current) return;

    const progress = scrollProgressRef.current;
    const scrollPx = typeof window !== "undefined" ? window.scrollY || document.documentElement.scrollTop || 0 : 0;
    const windowH = typeof window !== "undefined" ? window.innerHeight || 1 : 1;
    const pxToWorld = H / windowH;

    // Centered positions with guaranteed margin
    const closedCenterY = -measurements.closedCenter.y * scale + CENTER_Y_OFFSET;
    const openCenterY = -measurements.openCenter.y * scale + CENTER_Y_OFFSET;

    // Start position: only top of lid visible peeking at bottom (~45px)
    const peekPx = 45;
    const startY = -H / 2 - (measurements.closedCenter.y + measurements.closedSize.y / 2) * scale + peekPx * pxToWorld;

    // Rise phase driven 1:1 by actual scroll distance
    const riseWorldY = Math.min(closedCenterY, startY + scrollPx * pxToWorld);

    let currentY: number;
    let currentLidRotX: number;
    let currentRotX: number;
    let currentZ = 0;
    let shadowOp = 0;
    let screenGlow = 0;

    if (progress <= 0.30) {
      // 0.00–0.30 (rise): Driven by actual scroll distance, moves at exact same speed as hero
      currentY = riseWorldY;
      const riseDist = Math.max(0.001, closedCenterY - startY);
      const riseT = Math.min(1, Math.max(0, (currentY - startY) / riseDist));
      currentRotX = THREE.MathUtils.lerp(START_ROT_X, CENTER_ROT_X, riseT);
      currentLidRotX = LID_CLOSED_ROT;
      shadowOp = riseT * 0.65;
      screenGlow = 0;
    } else if (progress <= 0.80) {
      // 0.30–0.80 (open): Lid rotates open with power2.inOut, visual center stays put
      const openT = (progress - 0.30) / 0.50;
      const easeT = openT < 0.5 ? 2 * openT * openT : 1 - Math.pow(-2 * openT + 2, 2) / 2;

      currentLidRotX = THREE.MathUtils.lerp(LID_CLOSED_ROT, LID_OPEN_ROT, easeT);
      currentY = THREE.MathUtils.lerp(closedCenterY, openCenterY, easeT);
      currentRotX = CENTER_ROT_X;
      currentZ = easeT * 0.3; // Push forward +0.3 for depth
      shadowOp = 0.65;
      screenGlow = easeT * 0.4;
    } else {
      // 0.80–1.00 (hold): Stays open and centered (clean hook: future screen-expand will replace this)
      currentLidRotX = LID_OPEN_ROT;
      currentY = openCenterY;
      currentRotX = CENTER_ROT_X;
      currentZ = 0.3;
      shadowOp = 0.65;
      screenGlow = 0.4;
    }

    // Direct ref updates
    laptopGroupRef.current.position.set(0, currentY, currentZ);
    laptopGroupRef.current.rotation.set(currentRotX, 0, 0);
    laptopGroupRef.current.scale.setScalar(scale);

    if (lidNodeRef.current) {
      lidNodeRef.current.rotation.x = currentLidRotX;
    }

    // Fade in faint PointLight in front of screen to illuminate keyboard
    if (screenLightRef.current) {
      screenLightRef.current.position.set(0, currentY + 0.6, currentZ + 0.9);
      screenLightRef.current.intensity = screenGlow;
    }

    // Shadow updates
    if (shadowGroupRef.current) {
      shadowGroupRef.current.position.set(0, currentY - 0.05, currentZ);
      shadowGroupRef.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).material) {
          const mat = (child as THREE.Mesh).material as THREE.Material;
          mat.opacity = shadowOp;
          mat.transparent = true;
        }
      });
    }
  });

  return (
    <>
      <CameraController />

      {/* Neutral Studio Environment */}
      <Environment preset="studio" background={false} />

      {/* Subtle soft blue rim light */}
      <pointLight
        position={[0, -2.5, -4]}
        color="#4A9EFF"
        intensity={1.8}
        distance={16}
      />
      <directionalLight
        position={[0, 3, -5]}
        color="#4A9EFF"
        intensity={1.2}
      />

      {/* Key & Ambient light */}
      <directionalLight position={[0, 8, 8]} intensity={1.3} />
      <ambientLight intensity={0.55} />

      {/* Faint PointLight in front of screen that lightly illuminates keyboard once open */}
      <pointLight
        ref={screenLightRef}
        color="#f0f6ff"
        intensity={0}
        distance={6}
      />

      {/* Laptop Group */}
      <group ref={laptopGroupRef} dispose={null}>
        <primitive object={scene} />
      </group>

      {/* Soft ContactShadows under the laptop */}
      <group ref={shadowGroupRef}>
        <ContactShadows
          position={[0, 0, 0]}
          opacity={0.65}
          scale={16.5}
          blur={2.4}
          far={4}
          resolution={512}
          color="#000000"
        />
      </group>
    </>
  );
}

export default function MacbookHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollProgressRef = useRef(0);

  const handleModelLoaded = React.useCallback(() => {
    ScrollTrigger.refresh();
  }, []);

  // GSAP ScrollTrigger timeline driving progress (0 → 1) over a 300vh scroll container
  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: containerRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: 1,
        onUpdate: (self) => {
          scrollProgressRef.current = self.progress;
        },
      });
    }, containerRef.current || undefined);

    return () => {
      ctx.revert();
    };
  }, []);

  return (
    // Tall scroll wrapper (~300vh) driving the 3D scene animation
    <div ref={containerRef} className="relative w-full h-[300vh] pointer-events-none">
      {/* Fixed transparent canvas layered over ASCII background */}
      <div
        className="fixed inset-0 w-full h-[100dvh] pointer-events-none z-10 overflow-hidden"
        style={{ background: "transparent" }}
      >
        <Canvas
          gl={{
            alpha: true,
            antialias: true,
            powerPreference: "high-performance",
          }}
          style={{ background: "transparent" }}
          dpr={[1, 2]}
          camera={{
            position: [CAMERA_X, CAMERA_Y, CAMERA_Z],
            fov: CAMERA_FOV,
          }}
        >
          <Suspense fallback={null}>
            <MacbookModel
              scrollProgressRef={scrollProgressRef}
              onModelLoaded={handleModelLoaded}
            />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
