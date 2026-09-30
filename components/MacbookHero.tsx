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
// TUNABLE CONSTANTS (Auto-fit sizing, camera, lid, materials & render orders)
// ============================================================================
export const MAX_W_FRAC = 0.80;          // Open laptop occupies max 80% of viewport width (desktop)
export const MAX_H_FRAC = 0.82;          // Open laptop occupies max 82% of viewport height (desktop)
export const MAX_W_FRAC_MOBILE = 0.92;   // Prominent width scale on narrow mobile portrait screens
export const MAX_H_FRAC_MOBILE = 0.82;   // Guaranteed vertical headroom on mobile screens
export const CENTER_Y_OFFSET = 0.35;     // Vertical offset to guarantee >= 8% margin top and bottom

// 1. Camera framing (near-frontal, low-perspective view)
export const CAMERA_X = 0;
export const CAMERA_Y = 0.28;             // Vertical center of screen (flattened perspective)
export const CAMERA_TARGET_Y = 0.28;      // Targeting screen center with zero vertical tilt
export const CAMERA_FOV = 19;             // Flattened perspective FOV (reduced from 27 down to 19)
export const CAMERA_Z = 13.2;            // Recomputed: H / (2 * tan(degToRad(19/2))) to preserve exact framing

export const CENTER_ROT_X = 0.0;         // Near-frontal view angle (screen perpendicular to camera)
export const START_ROT_X = 0.15;         // Initial subtle tilt at bottom peek

// 2. Open Lid Angle (95–100° range, screen perpendicular to camera)
export const LID_OPEN_ANGLE_DEG = 98;    // ~98° open display angle
export const LID_OPEN_ROT = (180 - LID_OPEN_ANGLE_DEG) * (Math.PI / 180); // ~1.4312 rad
export const LID_CLOSED_ROT = Math.PI;   // 180° (closed flat on base)

// 3. Apple Midnight Body & Trim Materials
export const MIDNIGHT_COLOR = "#25262A"; // True darker Apple Midnight base (#25262A)
export const MIDNIGHT_METALNESS = 0.80;  // Refined metallic sheen
export const MIDNIGHT_ROUGHNESS = 0.42;  // Balanced roughness to avoid plasticky gloss
export const MIDNIGHT_ENV_INTENSITY = 0.70; // Controlled specular reflection
export const KEYBOARD_WELL_COLOR = "#1D1E21"; // Matching dark well tone
export const TRIM_COLOR = "#25262A";          // Consistent body & hinge trim
export const LOGO_COLOR = "#000000";          // Pure jet black Apple logo
export const BEZEL_COLOR = "#000000";         // Pure black display bezel

// 4. Layer Render Orders (Draw order: Bezel/Screen -> Desktop -> Glass -> Badge -> Keyboard -> Logo)
export const RENDER_ORDER_BEZEL_SCREEN = 1;
export const RENDER_ORDER_GLASS = 2;
export const RENDER_ORDER_BADGE = 3;
export const RENDER_ORDER_KEYBOARD = 4;
export const RENDER_ORDER_LOGO = 5;

// 5. Normal Offsets (tiny fixed offsets along local normal to prevent z-fighting at flat grazing angles)
export const OFFSET_SCREEN_NORMAL = 0.0015;
export const OFFSET_GLASS_NORMAL = 0.0015;
export const OFFSET_BADGE_NORMAL = 0.0030;
export const OFFSET_KEYBOARD_NORMAL = 0.0015;
export const OFFSET_LOGO_NORMAL = 0.0015;

// 6. Keyboard Deck Dimensions
export const KEYBOARD_WIDTH = 29.6;      // Expanded width across MacBook chassis (was 27.7)
export const KEYBOARD_DEPTH = 10.8;      // Proportional depth on the palmrest deck
export const KEYBOARD_POS_Z = -5.8;      // Z position centered on upper deck

export const LOGO_SIZE = 3.46;           // ~11% of lid width (31.48 * 0.11)
export const LOGO_ROT_Z = Math.PI;       // Authentic Apple lid orientation (leaf to top, bite to right)
export const LOGO_Y = -0.854;            // Precise outer surface coordinate of aluminum lid (from raycast)
export const LOGO_Z = -11.0;             // Centered vertically between hinge (Z=0) and opening lip (Z=-21.88)
export const LOGO_ROUGHNESS = 0.12;      // Glossy polished finish
export const LOGO_METALNESS = 0.5;       // Subtle obsidian specular reflection

export const SCREEN_MESH_NAME = "matte";
export const LID_NODE_NAME = "screen";
export const BODY_NODE_NAME = "body";
export const MODEL_PATH = "/mac.glb";
export const WALLPAPER_PATH = "/goldengate.jpg";

interface ModelMeasurements {
  openSize: THREE.Vector3;
  openCenter: THREE.Vector3;
  closedSize: THREE.Vector3;
  closedCenter: THREE.Vector3;
}

interface SceneProps {
  scrollProgressRef: React.MutableRefObject<number>;
  scrollYRef: React.MutableRefObject<number>;
  onModelLoaded: () => void;
  isMobile: boolean;
}

// ============================================================================
// Helper: Texture Configuration
// ============================================================================
function configureCanvasTexture(
  texture: THREE.CanvasTexture,
  maxAnisotropy = 16
): THREE.CanvasTexture {
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

// ============================================================================
// Helper: Draw Apple Logo Texture using simple-icons (1024x1024 Fixed Native)
// ============================================================================
function createAppleLogoTexture(maxAnisotropy = 16): THREE.CanvasTexture {
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
  return configureCanvasTexture(texture, maxAnisotropy);
}

// ============================================================================
// Helper: Draw US MacBook Pro Keyboard on a 1536x585 Fixed Native Canvas (25% smaller than 2048x780)
// ============================================================================
function createKeyboardTexture(maxAnisotropy = 16): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1536;
  canvas.height = 585;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Speaker Grilles (Left and Right narrow vertical strips of micro-dots)
    ctx.fillStyle = "#0a0a0c";
    const dotSpacing = 8;
    const dotRadius = 1.5;

    // Left speaker grille
    for (let gx = 26; gx < 116; gx += dotSpacing) {
      for (let gy = 38; gy < 548; gy += dotSpacing) {
        ctx.beginPath();
        ctx.arc(gx, gy, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Right speaker grille
    for (let gx = canvas.width - 116; gx < canvas.width - 26; gx += dotSpacing) {
      for (let gy = 38; gy < 548; gy += dotSpacing) {
        ctx.beginPath();
        ctx.arc(gx, gy, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 2. Keyboard Key Well (Anodized dark recessed well matching Midnight tone)
    const wellX = 131;
    const wellY = 23;
    const wellW = canvas.width - 262; // 1274px
    const wellH = 540;
    const wellR = 11;

    ctx.fillStyle = KEYBOARD_WELL_COLOR;
    ctx.beginPath();
    ctx.roundRect(wellX, wellY, wellW, wellH, wellR);
    ctx.fill();

    // 3. Draw Keys
    const keyGap = 6;
    const padX = 11;
    const padY = 11;
    const innerW = wellW - padX * 2; // 1252px
    const keyRadius = 5;
    const keyColor = "#1c1c1e";
    const legendColor = "#d1d1d6";

    // Row definitions for US MacBook Pro layout (scaled by 0.375 from original 4096)
    const rowHeights = [44, 72, 72, 72, 72, 74];

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
          ctx.roundRect(currentX, currentY, keyW, halfH, 4);
          ctx.fill();

          // Up Arrow triangle
          ctx.fillStyle = legendColor;
          ctx.beginPath();
          ctx.moveTo(currentX + keyW / 2, currentY + halfH / 2 - 4);
          ctx.lineTo(currentX + keyW / 2 - 5, currentY + halfH / 2 + 4);
          ctx.lineTo(currentX + keyW / 2 + 5, currentY + halfH / 2 + 4);
          ctx.closePath();
          ctx.fill();

          // Half-height Down Arrow
          const downY = currentY + halfH + keyGap;
          ctx.fillStyle = keyColor;
          ctx.beginPath();
          ctx.roundRect(currentX, downY, keyW, halfH, 4);
          ctx.fill();

          // Down Arrow triangle
          ctx.fillStyle = legendColor;
          ctx.beginPath();
          ctx.moveTo(currentX + keyW / 2, downY + halfH / 2 + 4);
          ctx.lineTo(currentX + keyW / 2 - 5, downY + halfH / 2 - 4);
          ctx.lineTo(currentX + keyW / 2 + 5, downY + halfH / 2 - 4);
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
            ctx.roundRect(currentX + 5, currentY + 5, keyW - 10, rowH - 10, 5);
            ctx.fill();
            // Removed stroke for performance - subtle anyway
          } else if (key.isArrow === "left") {
            // Left Arrow
            const halfH = (rowH - keyGap) / 2;
            const arrowY = currentY + halfH + keyGap; // aligned with down arrow
            ctx.fillStyle = keyColor;
            ctx.beginPath();
            ctx.roundRect(currentX, arrowY, keyW, halfH, 4);
            ctx.fill();

            ctx.fillStyle = legendColor;
            ctx.beginPath();
            ctx.moveTo(currentX + keyW / 2 - 4, arrowY + halfH / 2);
            ctx.lineTo(currentX + keyW / 2 + 4, arrowY + halfH / 2 - 5);
            ctx.lineTo(currentX + keyW / 2 + 4, arrowY + halfH / 2 + 5);
            ctx.closePath();
            ctx.fill();
          } else if (key.isArrow === "right") {
            // Right Arrow
            const halfH = (rowH - keyGap) / 2;
            const arrowY = currentY + halfH + keyGap;
            ctx.fillStyle = keyColor;
            ctx.beginPath();
            ctx.roundRect(currentX, arrowY, keyW, halfH, 4);
            ctx.fill();

            ctx.fillStyle = legendColor;
            ctx.beginPath();
            ctx.moveTo(currentX + keyW / 2 + 4, arrowY + halfH / 2);
            ctx.lineTo(currentX + keyW / 2 - 4, arrowY + halfH / 2 - 5);
            ctx.lineTo(currentX + keyW / 2 - 4, arrowY + halfH / 2 + 5);
            ctx.closePath();
            ctx.fill();
          } else if (key.label) {
            // Text legend drawn at scaled resolution - maintain clarity with proportional fonts
            ctx.fillStyle = legendColor;
            const fontSize = rowIndex === 0 ? 14 : key.label.length > 2 ? 13 : 18;
            ctx.font = `500 ${fontSize}px -apple-system, "SF Pro Text", Inter, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            if (key.label === "caps lock" || key.label === "tab" || key.label === "shift") {
              ctx.textAlign = "left";
              ctx.fillText(key.label, currentX + 9, currentY + rowH / 2);
            } else if (key.label === "return" || key.label === "delete") {
              ctx.textAlign = "right";
              ctx.fillText(key.label, currentX + keyW - 9, currentY + rowH / 2);
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
  return configureCanvasTexture(texture, maxAnisotropy);
}

// ============================================================================
// Helper: Draw Wallpaper with Cover Fit, macOS Menu Bar & Notch
// Mobile: 1024×640 canvas (6× less GPU memory → faster load, sharper text)
// Desktop: 2560×1600 canvas (full quality)
// ============================================================================
function createMacOSWallpaperTexture(
  imgUrl: string,
  maxAnisotropy = 16,
  onReady?: () => void,
  isMobile = false
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  // Mobile canvas is 1024×640 — ~6× less pixels than 2560×1600.
  // Smaller texture = less mipmap downsampling = sharper text at mobile viewport sizes.
  const cW = isMobile ? 1024 : 2560;
  const cH = isMobile ? 640  : 1600;
  canvas.width  = cW;
  canvas.height = cH;

  // Scale factor for all px measurements (relative to desktop 2560×1600 baseline)
  const s = cW / 2560;

  const ctx = canvas.getContext("2d");

  const texture = new THREE.CanvasTexture(canvas);
  configureCanvasTexture(texture, maxAnisotropy);

  if (typeof window !== "undefined") {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = imgUrl;
    img.onload = () => {
      if (!ctx) return;

      // 1. Cover fit
      const imgAspect = img.width / img.height;
      const canvasAspect = cW / cH;
      let dw: number, dh: number, dx: number, dy: number;

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

      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, cW, cH);

      // Rounded top corners
      const topR = Math.round(38 * s);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, topR);
      ctx.arcTo(0, 0, topR, 0, topR);
      ctx.lineTo(cW - topR, 0);
      ctx.arcTo(cW, 0, cW, topR, topR);
      ctx.lineTo(cW, cH);
      ctx.lineTo(0, cH);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();

      // 2. Menu bar — transparent, white text with shadows
      // On mobile we use larger relative font sizes for crispness
      const barH = Math.round(82 * s);
      // Font sizes: on mobile boost by 1.5× relative to scale so they're legible
      const fontBoost = isMobile ? 1.5 : 1.0;
      const fontLg = Math.round(36 * s * fontBoost);  // Dharmik / Apple
      const fontMd = Math.round(34 * s * fontBoost);  // Menus / Date

      ctx.textBaseline = "middle";

      // Apple logo via Path2D
      const applePath = new Path2D(siApple.path);
      const logoH = Math.round(34 * s * fontBoost);
      const logoSc = logoH / 24;
      const logoX = Math.round(38 * s);
      const logoY = (barH - logoH) / 2;
      ctx.save();
      ctx.translate(logoX, logoY);
      ctx.scale(logoSc, logoSc);
      ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
      ctx.shadowBlur = Math.round(8 * s * fontBoost);
      ctx.shadowOffsetY = 1;
      ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
      ctx.fill(applePath);
      ctx.restore();
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Dharmik
      const dharmikX = Math.round((38 + 24 * logoSc + 10) * s);
      ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
      ctx.shadowBlur = Math.round(6 * s * fontBoost);
      ctx.shadowOffsetY = 1;
      ctx.fillStyle = "#ffffff";
      ctx.font = `700 ${fontLg}px -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif`;
      ctx.fillText("Dharmik", dharmikX + Math.round(logoH * 1.1), barH / 2);

      // Menus
      ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
      ctx.shadowBlur = Math.round(5 * s * fontBoost);
      ctx.shadowOffsetY = 1;
      ctx.font = `500 ${fontMd}px -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      const menus = ["File", "Edit", "View", "Window", "Help"];
      // Measure Dharmik width to position menus correctly
      ctx.font = `700 ${fontLg}px -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif`;
      const dharmikW = ctx.measureText("Dharmik").width;
      ctx.font = `500 ${fontMd}px -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif`;
      let menuX = dharmikX + Math.round(logoH * 1.1) + dharmikW + Math.round(42 * s * fontBoost);
      for (const m of menus) {
        ctx.fillText(m, menuX, barH / 2);
        menuX += ctx.measureText(m).width + Math.round(42 * s * fontBoost);
      }

      // Date & Time
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      const dateStr = now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
      const fullTimeStr = `${dateStr}  ${timeStr}`;
      ctx.textAlign = "right";
      ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
      ctx.shadowBlur = Math.round(5 * s * fontBoost);
      ctx.shadowOffsetY = 1;
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.font = `500 ${fontMd}px -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif`;
      ctx.fillText(fullTimeStr, cW - Math.round(52 * s), barH / 2);
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // 3. Notch
      const notchW = cW * 0.143;
      const notchH = Math.round(93 * s);
      const notchR = Math.round(22 * s);
      const notchX = (cW - notchW) / 2;
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

      // Camera lens
      ctx.fillStyle = "#080e1a";
      ctx.beginPath();
      ctx.arc(cW / 2, notchH * 0.45, Math.round(9.5 * s), 0, Math.PI * 2);
      ctx.fill();

      texture.needsUpdate = true;
      if (onReady) onReady();
    };
  }

  return texture;
}

// ============================================================================
// Helper: Draw Apple Boot Screen (768x522 Fixed Native Canvas - reduced from 1024x696)
// ============================================================================
interface AnimatedBadgeController {
  texture: THREE.CanvasTexture;
  update: (elapsed: number) => void;
}

function createAnimatedBadge(maxAnisotropy = 16): AnimatedBadgeController {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 522;
  const ctx = canvas.getContext("2d");

  const texture = new THREE.CanvasTexture(canvas);
  configureCanvasTexture(texture, maxAnisotropy);

  const applePath = new Path2D(siApple.path);
  const cx = canvas.width / 2;
  const lastWRef = { current: -1 };

  const update = (elapsed: number) => {
    if (!ctx) return;

    // Loop duration 3.6s
    const loopDuration = 3.6;
    const t = (elapsed % loopDuration) / loopDuration;
    // Multi-stage ease simulating authentic Apple OS boot loading
    const fillFraction = t < 0.25 
      ? t * 1.6 
      : t < 0.65 
        ? 0.40 + (t - 0.25) * 0.45 
        : 0.58 + (t - 0.65) * 1.20;

    const barW = 242;
    const barH = 3.5;
    const currentW = Math.round(Math.max(barH, Math.min(barW, barW * fillFraction)) * 2) / 2;

    // Redraw only when progress actually updates (prevents redundant GPU texture uploads on static frames)
    if (currentW === lastWRef.current) return;
    lastWRef.current = currentW;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Large Top Apple Logo
    ctx.save();
    const logoScale = 3.94;
    const logoW = 24 * logoScale; // ~95px
    const logoX = (canvas.width - logoW) / 2;
    const logoY = 33;
    ctx.translate(logoX, logoY);
    ctx.scale(logoScale, logoScale);

    // Crisp Apple logo with ambient drop shadow
    ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
    ctx.shadowBlur = 13;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = "#ffffff";
    ctx.fill(applePath);
    ctx.restore();

    // 2. Extra Wide Gap, followed by Centered Fonts (close together)
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Title: Dk's MacBook (native font size for 768px canvas)
    ctx.fillStyle = "#ffffff";
    ctx.font = '600 38px -apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif';
    ctx.letterSpacing = "0.02em";
    ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
    ctx.shadowBlur = 11;
    ctx.shadowOffsetY = 3;
    ctx.fillText("Dk's MacBook", cx, 285);

    // Subtitle: Available Soon (close to title)
    ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
    ctx.font = '400 23px -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif';
    ctx.letterSpacing = "0.04em";
    ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
    ctx.shadowBlur = 9;
    ctx.shadowOffsetY = 2;
    ctx.fillText("Available Soon", cx, 321);
    ctx.restore();

    // 3. Animated Progress Loading Bar (near the fonts below)
    ctx.save();
    const barR = barH / 2;
    const barX = (canvas.width - barW) / 2;
    const barY = 370;

    // Dark translucent background track
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 7;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, barR);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(255, 255, 255, 0.5)";
    ctx.shadowBlur = 5.5;
    ctx.beginPath();
    ctx.roundRect(barX, barY, currentW, barH, barR);
    ctx.fill();
    ctx.restore();

    texture.needsUpdate = true;
  };

  update(0);
  return { texture, update };
}

function CameraController() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(CAMERA_X, CAMERA_Y, CAMERA_Z);
    camera.lookAt(0, CAMERA_TARGET_Y, 0);
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
}

function MacbookModel({ scrollProgressRef, scrollYRef, onModelLoaded, isMobile }: SceneProps) {
  const laptopGroupRef = useRef<THREE.Group>(null);
  const lidNodeRef = useRef<THREE.Object3D | null>(null);
  const shadowGroupRef = useRef<THREE.Group>(null);
  const screenLightRef = useRef<THREE.PointLight>(null);
  const badgeControllerRef = useRef<AnimatedBadgeController | null>(null);
  const shadowMeshRef = useRef<THREE.Mesh | null>(null);

  const [measurements, setMeasurements] = useState<ModelMeasurements | null>(null);
  const [isReady, setIsReady] = useState(false);

  const { scene } = useGLTF(MODEL_PATH);
  const { size, gl } = useThree();
  const maxAnisotropy = gl.capabilities.getMaxAnisotropy();

  // Pre-cache constants to avoid per-frame allocations
  const aspect = size.width / Math.max(1, size.height);
  const H = 2 * CAMERA_Z * Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2));
  const W = H * aspect;

  // Mobile-specific render settings
  const showBadgeAnimation = !isMobile; // Disable badge animation on mobile for performance
  const shadowResolution = isMobile ? 64 : 128;
  const contactShadowBlur = isMobile ? 1.5 : 2.4;
  const envIntensityMobile = isMobile ? 0.4 : 0.7;

  // Auto-fit scale using OPEN laptop measurements (with prominent mobile fractions)
  const scale = useMemo(() => {
    if (!measurements) return 0.14;
    const maxW = isMobile ? MAX_W_FRAC_MOBILE : MAX_W_FRAC;
    const maxH = isMobile ? MAX_H_FRAC_MOBILE : MAX_H_FRAC;
    return Math.min(
      (W * maxW) / measurements.openSize.x,
      (H * maxH) / measurements.openSize.y
    );
  }, [measurements, W, H, isMobile]);

  // Pre-compute constant values for useFrame
  const closedCenterYRef = useRef(0);
  const openCenterYRef = useRef(0);
  const startYRef = useRef(0);
  const pxToWorldRef = useRef(H / (typeof window !== "undefined" ? window.innerHeight : 1));
  const HRef = useRef(H);

  // Model preparation: Measure poses, add keyboard deck, Apple logo, display & chin
  useEffect(() => {
    if (!scene) return;

    // 0. Update GLB materials for Apple Midnight finish
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((mat) => {
          if (!mat) return;
          if (mat.name === "aluminium") {
            mat.color = new THREE.Color(MIDNIGHT_COLOR);
            mat.metalness = MIDNIGHT_METALNESS;
            mat.roughness = MIDNIGHT_ROUGHNESS;
            mat.envMapIntensity = isMobile ? envIntensityMobile : MIDNIGHT_ENV_INTENSITY;
            mat.needsUpdate = true;
          } else if (mat.name === "blackmatte") {
            if (child.name === BODY_NODE_NAME) {
              mat.color = new THREE.Color(TRIM_COLOR);
              mat.roughness = 0.55;
              mat.metalness = 0.25;
              mat.envMapIntensity = isMobile ? 0.3 : 0.5;
              mat.needsUpdate = true;
            } else if (child.name === "back") {
              mat.color = new THREE.Color(LOGO_COLOR);
              mat.roughness = 0.12;
              mat.metalness = 0.5;
              mat.needsUpdate = true;
            }
          } else if (mat.name === "matte" || child.name === SCREEN_MESH_NAME) {
            mat.color = new THREE.Color(BEZEL_COLOR);
            mat.needsUpdate = true;
          }
        });
      }
    });

    const lidNode = scene.getObjectByName(LID_NODE_NAME);
    const bodyNode = scene.getObjectByName(BODY_NODE_NAME);
    const group = laptopGroupRef.current;
    if (!group) return;

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

      // Defer setState to avoid synchronous setState in effect warning
      setTimeout(() => {
        setMeasurements({
          openSize,
          openCenter,
          closedSize,
          closedCenter,
        });
      }, 0);

      // Cache for useFrame
      closedCenterYRef.current = -closedCenter.y * 0.14 + CENTER_Y_OFFSET; // temporary scale
      openCenterYRef.current = -openCenter.y * 0.14 + CENTER_Y_OFFSET;
      startYRef.current = -HRef.current / 2 - (closedCenter.y + closedSize.y / 2) * 0.14 + 45 * (HRef.current / (typeof window !== "undefined" ? window.innerHeight : 1));

      lidNodeRef.current = lidNode;
    }

    // 2. Keyboard on the deck (expanded width matching MacBook Pro proportions)
    if (bodyNode) {
      const oldKb = bodyNode.getObjectByName("keyboardDeckPlane");
      if (oldKb) bodyNode.remove(oldKb);

      const kbTexture = createKeyboardTexture(maxAnisotropy);
      const kbGeo = new THREE.PlaneGeometry(KEYBOARD_WIDTH, KEYBOARD_DEPTH);
      const kbMat = new THREE.MeshStandardMaterial({
        map: kbTexture,
        transparent: true,
        roughness: 0.85,
        metalness: 0.1,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      const kbMesh = new THREE.Mesh(kbGeo, kbMat);
      kbMesh.name = "keyboardDeckPlane";
      kbMesh.renderOrder = RENDER_ORDER_KEYBOARD;
      kbMesh.rotation.x = -Math.PI / 2;
      kbMesh.position.set(0, 0.0326 + OFFSET_KEYBOARD_NORMAL, KEYBOARD_POS_Z);
      bodyNode.add(kbMesh);
    }

    // 3. Apple logo on the outer (back) face of the lid
    if (lidNode) {
      const oldLogo = lidNode.getObjectByName("appleLidLogo");
      if (oldLogo) lidNode.remove(oldLogo);

      const appleLogoTexture = createAppleLogoTexture(maxAnisotropy);
      const logoGeo = new THREE.PlaneGeometry(LOGO_SIZE, LOGO_SIZE);
      const logoMat = new THREE.MeshStandardMaterial({
        map: appleLogoTexture,
        transparent: true,
        roughness: LOGO_ROUGHNESS,
        metalness: LOGO_METALNESS,
        color: "#ffffff",
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
        side: THREE.FrontSide,
        depthWrite: false,
      });
      const logoMesh = new THREE.Mesh(logoGeo, logoMat);
      logoMesh.name = "appleLidLogo";
      logoMesh.renderOrder = RENDER_ORDER_LOGO;
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

      const wallpaperTexture = createMacOSWallpaperTexture(WALLPAPER_PATH, maxAnisotropy, undefined, isMobile);
      const planeGeo = new THREE.PlaneGeometry(screenW, screenH);
      const planeMat = new THREE.MeshBasicMaterial({
        map: wallpaperTexture,
        toneMapped: false,
        side: THREE.FrontSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      const displayPlane = new THREE.Mesh(planeGeo, planeMat);
      displayPlane.name = "macOSDisplayPlane";
      displayPlane.renderOrder = RENDER_ORDER_BEZEL_SCREEN;
      displayPlane.rotation.x = -Math.PI / 2;
      displayPlane.position.set(0, -0.422, -11.522);

      // Subtle glossy glass gradient overlay - disable on mobile for performance
      if (!isMobile) {
        const glassMat = new THREE.MeshStandardMaterial({
          color: "#ffffff",
          transparent: true,
          opacity: 0.05,
          roughness: 0.08,
          metalness: 0.15,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        });
        const glassPlane = new THREE.Mesh(planeGeo.clone(), glassMat);
        glassPlane.name = "glassOverlayPlane";
        glassPlane.renderOrder = RENDER_ORDER_GLASS;
        glassPlane.position.set(0, 0, OFFSET_GLASS_NORMAL);
        displayPlane.add(glassPlane);
      }

      // 5. Apple Boot Screen Display Mesh (Prominent Size)
      if (showBadgeAnimation) {
        const badgeController = createAnimatedBadge(maxAnisotropy);
        badgeControllerRef.current = badgeController;

        const badgeW = 12.0;
        const badgeH = 8.14;
        const badgeGeo = new THREE.PlaneGeometry(badgeW, badgeH);
        const badgeMat = new THREE.MeshBasicMaterial({
          map: badgeController.texture,
          transparent: true,
          toneMapped: false,
          side: THREE.FrontSide,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        });
        const badgeMesh = new THREE.Mesh(badgeGeo, badgeMat);
        badgeMesh.name = "showcaseBadge";
        badgeMesh.renderOrder = RENDER_ORDER_BADGE;
        badgeMesh.position.set(0, 0, OFFSET_BADGE_NORMAL);
        displayPlane.add(badgeMesh);
      }

      lidNode.add(displayPlane);
    }

    // Cache reference to shadow mesh for direct opacity updates (avoid traverse)
    if (shadowGroupRef.current) {
      shadowGroupRef.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          shadowMeshRef.current = child as THREE.Mesh;
        }
      });
    }

    // Mark as ready - this gates rendering
    setIsReady(true);
    onModelLoaded();
  }, [scene, onModelLoaded, isMobile, maxAnisotropy, showBadgeAnimation, envIntensityMobile]);

  // Update cached values when measurements/scale change
  useEffect(() => {
    if (!measurements) return;
    const s = scale;
    closedCenterYRef.current = -measurements.closedCenter.y * s + CENTER_Y_OFFSET;
    openCenterYRef.current = -measurements.openCenter.y * s + CENTER_Y_OFFSET;
    startYRef.current = -HRef.current / 2 - (measurements.closedCenter.y + measurements.closedSize.y / 2) * s + 45 * pxToWorldRef.current;
  }, [measurements, scale]);

  // Update pxToWorld on resize
  useEffect(() => {
    const updatePxToWorld = () => {
      pxToWorldRef.current = HRef.current / (window.innerHeight || 1);
      if (measurements) {
        startYRef.current = -HRef.current / 2 - (measurements.closedCenter.y + measurements.closedSize.y / 2) * scale + 45 * pxToWorldRef.current;
      }
    };
    updatePxToWorld();
    window.addEventListener("resize", updatePxToWorld, { passive: true });
    return () => window.removeEventListener("resize", updatePxToWorld);
  }, [measurements, scale]);

  // Frame-by-frame update loop - heavily optimized
  useFrame((state) => {
    // Only update badge animation on desktop and when display lid is exposing the screen
    if (showBadgeAnimation && badgeControllerRef.current && scrollProgressRef.current > 0.28) {
      badgeControllerRef.current.update(state.clock.elapsedTime);
    }

    if (!measurements || !laptopGroupRef.current) return;

    const progress = scrollProgressRef.current;
    // Use cached scrollY ref — avoids expensive DOM read in hot render path (item 5)
    const scrollPx = scrollYRef.current;
    const pxToWorld = pxToWorldRef.current;
    const closedCenterY = closedCenterYRef.current;
    const openCenterY = openCenterYRef.current;
    const startY = startYRef.current;

    // Rise phase driven 1:1 by actual scroll distance
    const riseWorldY = Math.min(closedCenterY, startY + scrollPx * pxToWorld);

    let currentY: number;
    let currentLidRotX: number;
    let currentRotX: number;
    let currentZ = 0;
    let shadowOp = 0;
    let screenGlow = 0;

    if (progress <= 0.30) {
      currentY = riseWorldY;
      const riseDist = Math.max(0.001, closedCenterY - startY);
      const riseT = Math.min(1, Math.max(0, (currentY - startY) / riseDist));
      currentRotX = THREE.MathUtils.lerp(START_ROT_X, CENTER_ROT_X, riseT);
      currentLidRotX = LID_CLOSED_ROT;
      shadowOp = riseT * 0.65;
      screenGlow = 0;
    } else if (progress <= 0.80) {
      const openT = (progress - 0.30) / 0.50;
      const easeT = openT < 0.5 ? 2 * openT * openT : 1 - Math.pow(-2 * openT + 2, 2) / 2;

      currentLidRotX = THREE.MathUtils.lerp(LID_CLOSED_ROT, LID_OPEN_ROT, easeT);
      currentY = THREE.MathUtils.lerp(closedCenterY, openCenterY, easeT);
      currentRotX = CENTER_ROT_X;
      currentZ = easeT * 0.3;
      shadowOp = 0.65;
      screenGlow = easeT * 0.4;
    } else {
      currentLidRotX = LID_OPEN_ROT;
      currentY = openCenterY;
      currentRotX = CENTER_ROT_X;
      currentZ = 0.3;
      shadowOp = 0.65;
      screenGlow = 0.4;
    }

    // Direct ref updates - no allocations
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

    // Shadow updates - direct mesh reference instead of traverse
    if (shadowGroupRef.current) {
      shadowGroupRef.current.position.set(0, currentY - 0.05, currentZ);
      if (shadowMeshRef.current && shadowMeshRef.current.material) {
        const mat = shadowMeshRef.current.material as THREE.Material;
        mat.opacity = shadowOp;
        mat.transparent = true;
      }
    }
  });

  // Only render scene after fully initialized - prevents loading glitch
  // Render immediately once scene is available; isReady prevents glitch during setup
  const shouldRender = isReady || !!scene;
  if (!shouldRender) {
    return (
      <>
        <CameraController />
        <Environment preset="city" background={false} />
        <ambientLight intensity={0.65} />
        <directionalLight position={[0, 6, 6]} intensity={1.1} />
        <pointLight position={[0, -2.5, -4]} color="#4A9EFF" intensity={1.8} distance={16} />
        <directionalLight position={[0, 3, -5]} color="#4A9EFF" intensity={1.2} />
        <pointLight ref={screenLightRef} color="#f0f6ff" intensity={0} distance={6} />
      </>
    );
  }

  return (
    <>
      <CameraController />

      {/* Flatter Ambient Environment without dark zenith artifacts */}
      <Environment preset="city" background={false} />

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

      {/* Balanced Key & Ambient light (even illumination without harsh top shadows) */}
      <directionalLight position={[0, 6, 6]} intensity={1.1} />
      <ambientLight intensity={0.65} />

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

      {/* Soft ContactShadows under the laptop - lower resolution on mobile */}
      <group ref={shadowGroupRef}>
        <ContactShadows
          position={[0, 0, 0]}
          opacity={isMobile ? 0.5 : 0.65}
          scale={16.5}
          blur={contactShadowBlur}
          far={4}
          resolution={shadowResolution}
          color="#000000"
        />
      </group>
    </>
  );
}

export default function MacbookHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollProgressRef = useRef(0);
  // Cache scrollY in a ref updated via passive scroll listener — avoids
  // expensive window.scrollY DOM read inside the hot useFrame path (item 5)
  const scrollYRef = useRef(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile, { passive: true });
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Keep scrollYRef in sync via passive listener — no DOM read in render loop
  useEffect(() => {
    const onScroll = () => {
      scrollYRef.current = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleModelLoaded = React.useCallback(() => {
    // Defer refresh to avoid layout thrash on model load
    requestAnimationFrame(() => {
      ScrollTrigger.refresh();
    });
  }, []);

  // GSAP ScrollTrigger timeline driving progress (0 → 1) over a 300vh scroll container
  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: containerRef.current,
        start: "top top",
        end: "bottom bottom",
        // scrub:0 on mobile = instant update, no deferred JS work per frame (item 5)
        scrub: isMobile ? 0 : 1,
        onUpdate: (self) => {
          scrollProgressRef.current = self.progress;
        },
        refreshPriority: 1,
      });
    }, containerRef.current || undefined);

    return () => {
      ctx.revert();
    };
  }, [isMobile]);

  // DPR [1,2] on both — mobile uses 1024×640 wallpaper (6× smaller) so GPU headroom is fine
  const canvasDpr = [1, 2] as [number, number];

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
            antialias: !isMobile, // Disable antialias on mobile for performance
            powerPreference: "high-performance",
            preserveDrawingBuffer: false,
          }}
          style={{ background: "transparent" }}
          dpr={canvasDpr}
          camera={{
            position: [CAMERA_X, CAMERA_Y, CAMERA_Z],
            fov: CAMERA_FOV,
          }}
        >
          <Suspense fallback={null}>
            <MacbookModel
              scrollProgressRef={scrollProgressRef}
              scrollYRef={scrollYRef}
              onModelLoaded={handleModelLoaded}
              isMobile={isMobile}
            />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
