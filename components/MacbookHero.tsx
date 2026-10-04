"use client";

import React, { Suspense, useEffect, useRef, useState, useMemo, useCallback } from "react";
import MacDock, { ScreenRect } from "./MacDock";
import EducationWindow from "./EducationWindow";
import SiriAI from "./SiriAI";
import ProjectsFinder from "./ProjectsFinder";
import { Canvas, useFrame, useThree, invalidate } from "@react-three/fiber";
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

// 7. Physical Lid Dimensions for Zoom Target Framing (all 4 bezels visible, keyboard excluded)
export const TOTAL_LID_WIDTH = 31.48;
export const TOTAL_LID_HEIGHT = 21.88;
export const LID_CENTER_Y = 10.94; // Physical lid center in local space (21.88 / 2)

function computeZoomTarget(viewportW: number, viewportH: number, isMob: boolean) {
  // Match exact reference framing:
  // Desktop display width fills ~74% of viewport width (matching Reference 2)
  // Mobile display width fills ~92% of viewport width
  const maxLidW = isMob ? 0.92 : 0.74;
  const maxLidH = isMob ? 0.80 : 0.94;
  const targetScale = Math.min(
    (viewportW * maxLidW) / TOTAL_LID_WIDTH,
    (viewportH * maxLidH) / TOTAL_LID_HEIGHT
  );

  // Position hinge below the viewport bottom so the keyboard/deck is completely pushed
  // outside the viewport, while the bottom black bezel clearly frames the display.
  // On mobile: center the lid vertically in the viewport.
  const vBottom = CAMERA_TARGET_Y - viewportH / 2;
  const targetGroupY = isMob
    ? CAMERA_TARGET_Y - LID_CENTER_Y * targetScale
    : vBottom - 0.038 * viewportH;

  return { targetScale, targetGroupY, targetGroupZ: 0.45 };
}

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
  screenRectRef: React.MutableRefObject<ScreenRect | null>;
}

// ============================================================================
// Helper: Texture Configuration (mipmapped — for keyboard, logo etc.)
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
//
// Canvas sizing rationale (IMPORTANT — read before changing):
//   On mobile the screen mesh (~30.375 wu) maps to roughly 450–500 screen pixels
//   at DPR 2. A 2560px texture displayed at 450px forces WebGL to bilinear-sample
//   only 4 of the ~5×5 source texels per output pixel (LinearFilter) — producing
//   aliasing that looks like blur. The correct fix is to keep the canvas close to
//   the display size and let mipmaps handle any residual downscaling.
//
//   Mobile: 1024×640 ≈ 2× the ~450×290 display pixels at DPR 2.
//     Keeps glyphs at ~26px on the canvas (minimum ~12px for crisp canvas text).
//     Mipmaps handle the clean 2:1 downscale without blur.
//   Desktop: 2560×1600 for high-res displays.
// ============================================================================
function createMacOSWallpaperTexture(
  imgUrl: string,
  maxAnisotropy = 16,
  onReady?: () => void,
  isMobile = false
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  // Mobile: 1024×640 — 2× the ~450×290 screen mesh display size at DPR 2.
  // Glyphs draw at ~26px (crisp for canvas 2D). Mipmaps handle the 2:1
  // downscale cleanly. 512×320 produced sub-10px glyphs that are
  // inherently soft due to canvas 2D anti-aliasing at tiny sizes.
  // Desktop: 2560×1600 for high-res displays.
  const cW = isMobile ? 1024 : 2560;
  const cH = isMobile ? 640  : 1600;
  canvas.width  = cW;
  canvas.height = cH;

  // Scale factor relative to 2560×1600 baseline
  const s = cW / 2560;

  const ctx = canvas.getContext("2d");

  // Restore mipmaps: at near 1:1 scale they add no blur; for any residual
  // downscaling they pre-compute the correct filtered output far better than
  // LinearFilter alone at high scale ratios.
  const texture = new THREE.CanvasTexture(canvas);
  configureCanvasTexture(texture, maxAnisotropy);

  if (typeof window !== "undefined") {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = imgUrl;
    img.onload = () => {
      if (!ctx) return;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

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

      // 2. Menu bar
      const barH = Math.round(82 * s);
      // fontBoost scales font px for the mobile 512px canvas (s=0.2).
      // 2.0× → fontLg≈14px, fontMd≈14px on a 512px canvas ≈ real macOS bar proportions.
      // Increase toward 3.0 to make text larger, decrease toward 1.5 to make it smaller.
      const fontBoost = isMobile ? 1.3 : 1.0;
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
      // Skip shadow blur on mobile: canvas shadowBlur softens glyphs significantly
      // on small canvases where blur radius is proportionally large.
      if (!isMobile) {
        ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
        ctx.shadowBlur = Math.round(8 * s);
        ctx.shadowOffsetY = 1;
      }
      ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
      ctx.fill(applePath);
      ctx.restore();
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // ── Pre-compute notch geometry (needed for menu clipping below) ──────────
      const notchW = cW * 0.143;
      const notchH = Math.round(93 * s);
      const notchR = Math.round(22 * s);
      const notchX = (cW - notchW) / 2;       // left edge of notch
      const notchRightX = notchX + notchW;     // right edge of notch
      // Menu items must end at least this many px before the notch left edge
      const notchGap = Math.round(16 * s);

      // Dharmik
      const dharmikX = Math.round((38 + 24 * logoSc + 10) * s);
      if (!isMobile) {
        ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
        ctx.shadowBlur = Math.round(6 * s);
        ctx.shadowOffsetY = 1;
      }
      ctx.fillStyle = "#ffffff";
      ctx.font = `700 ${fontLg}px -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif`;
      ctx.fillText("Dharmik", dharmikX + Math.round(logoH * 1.1), barH / 2);

      // Menus — skip any item whose right edge would overlap the notch
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      if (!isMobile) {
        ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
        ctx.shadowBlur = Math.round(5 * s);
        ctx.shadowOffsetY = 1;
      }
      ctx.font = `500 ${fontMd}px -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      const menus = ["File", "Edit", "View", "Window", "Help"];
      ctx.font = `700 ${fontLg}px -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif`;
      const dharmikW = ctx.measureText("Dharmik").width;
      ctx.font = `500 ${fontMd}px -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif`;
      let menuX = dharmikX + Math.round(logoH * 1.1) + dharmikW + Math.round(42 * s * fontBoost);
      for (const m of menus) {
        const mW = ctx.measureText(m).width;
        // Stop drawing if this menu item would touch or cross the notch
        if (menuX + mW > notchX - notchGap) break;
        ctx.fillText(m, menuX, barH / 2);
        menuX += mW + Math.round(42 * s * fontBoost);
      }

      // Date & Time — only draw if it fits to the right of the notch
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      const dateStr = now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
      const fullTimeStr = `${dateStr}  ${timeStr}`;
      ctx.font = `500 ${fontMd}px -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif`;
      const timeW = ctx.measureText(fullTimeStr).width;
      const timeX = cW - Math.round(52 * s);
      // Only draw time if it doesn't overlap the right edge of the notch
      if (timeX - timeW > notchRightX + notchGap) {
        ctx.textAlign = "right";
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        if (!isMobile) {
          ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
          ctx.shadowBlur = Math.round(5 * s);
          ctx.shadowOffsetY = 1;
        }
        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        ctx.fillText(fullTimeStr, timeX, barH / 2);
      }
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // 3. Notch (drawn last — paints over any menu pixel that bleeds under it)
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



function CameraController() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(CAMERA_X, CAMERA_Y, CAMERA_Z);
    camera.lookAt(0, CAMERA_TARGET_Y, 0);
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
}

function MacbookModel({ scrollProgressRef, scrollYRef, onModelLoaded, isMobile, screenRectRef }: SceneProps) {
  const laptopGroupRef = useRef<THREE.Group>(null);
  const lidNodeRef = useRef<THREE.Object3D | null>(null);
  const shadowGroupRef = useRef<THREE.Group>(null);
  const screenLightRef = useRef<THREE.PointLight>(null);
  const shadowMeshRef = useRef<THREE.Mesh | null>(null);
  const displayPlaneRef = useRef<THREE.Mesh | null>(null);

  // Reusable vectors for screen projection (zero-alloc in hot path)
  const _projVec = useMemo(() => new THREE.Vector3(), []);
  const _projCorners = useMemo(() => [
    new THREE.Vector3(), new THREE.Vector3(),
    new THREE.Vector3(), new THREE.Vector3(),
  ], []);

  const [measurements, setMeasurements] = useState<ModelMeasurements | null>(null);
  const [isReady, setIsReady] = useState(false);

  const { scene } = useGLTF(MODEL_PATH);
  const { size, gl } = useThree();
  const rawAnisotropy = gl.capabilities.getMaxAnisotropy();
  const maxAnisotropy = isMobile ? Math.min(rawAnisotropy, 4) : rawAnisotropy;

  // Pre-cache constants to avoid per-frame allocations
  const aspect = size.width / Math.max(1, size.height);
  const H = 2 * CAMERA_Z * Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2));
  const W = H * aspect;

  // Mobile-specific render settings
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
  const targetScaleRef = useRef(0.18);
  const targetGroupYRef = useRef(0);
  const targetGroupZRef = useRef(0.45);
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

    let initialScale = scale;
    let measuredData: ModelMeasurements | null = null;

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

      // Compute accurate scale and initial position for current viewport
      const maxW = isMobile ? MAX_W_FRAC_MOBILE : MAX_W_FRAC;
      const maxH = isMobile ? MAX_H_FRAC_MOBILE : MAX_H_FRAC;
      initialScale = Math.min(
        (W * maxW) / openSize.x,
        (H * maxH) / openSize.y
      );

      const pxToWorld = pxToWorldRef.current;
      const closedCenterY = -closedCenter.y * initialScale + CENTER_Y_OFFSET;
      const openCenterY = -openCenter.y * initialScale + CENTER_Y_OFFSET;
      const startY = -HRef.current / 2 - (closedCenter.y + closedSize.y / 2) * initialScale + 45 * pxToWorld;

      // Cache for useFrame
      closedCenterYRef.current = closedCenterY;
      openCenterYRef.current = openCenterY;
      startYRef.current = startY;

      // Position group and lid at exact bottom peek position immediately (prevents drop-from-top glitch)
      group.position.set(0, startY, 0);
      group.rotation.set(START_ROT_X, 0, 0);
      group.scale.setScalar(initialScale);
      lidNode.rotation.x = LID_CLOSED_ROT;
      group.updateMatrixWorld(true);

      if (shadowGroupRef.current) {
        shadowGroupRef.current.position.set(0, startY - 0.05, 0);
      }

      lidNodeRef.current = lidNode;

      measuredData = {
        openSize,
        openCenter,
        closedSize,
        closedCenter,
      };
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

      // Pass raw (uncapped) anisotropy to the wallpaper texture so mobile screen
      // fonts are as sharp as possible regardless of the global mobile cap.
      const wallpaperTexture = createMacOSWallpaperTexture(WALLPAPER_PATH, rawAnisotropy, undefined, isMobile);
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
      displayPlaneRef.current = displayPlane;
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

      lidNode.add(displayPlane);

      // Compute final zoom framing targets (keyboard excluded, all 4 bezels preserved)
      const zoomTarget = computeZoomTarget(W, H, isMobile);
      targetScaleRef.current = zoomTarget.targetScale;
      targetGroupYRef.current = zoomTarget.targetGroupY;
      targetGroupZRef.current = zoomTarget.targetGroupZ;

      // Restore lid and group to initial closed bottom-peek pose
      lidNode.rotation.x = LID_CLOSED_ROT;
      group.position.set(0, startYRef.current, 0);
      group.rotation.set(START_ROT_X, 0, 0);
      group.scale.setScalar(initialScale);
      group.updateMatrixWorld(true);
    }

    // Cache reference to shadow mesh for direct opacity updates (avoid traverse)
    if (shadowGroupRef.current) {
      shadowGroupRef.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          shadowMeshRef.current = child as THREE.Mesh;
        }
      });
    }

    // Mark as ready and commit measurements together in macrotask to avoid setState-in-effect cascading render warning
    const timer = setTimeout(() => {
      if (measuredData) {
        setMeasurements(measuredData);
      }
      setIsReady(true);
      onModelLoaded();
    }, 0);

    return () => clearTimeout(timer);
  }, [scene, onModelLoaded, isMobile, maxAnisotropy, envIntensityMobile, W, H]);

  // On mobile: request render frame when ready or measurements change
  useEffect(() => {
    if (isReady && isMobile) {
      invalidate();
    }
  }, [isReady, isMobile]);

  // Update cached values when measurements/scale change
  useEffect(() => {
    if (!measurements) return;
    const s = scale;
    closedCenterYRef.current = -measurements.closedCenter.y * s + CENTER_Y_OFFSET;
    openCenterYRef.current = -measurements.openCenter.y * s + CENTER_Y_OFFSET;
    startYRef.current = -HRef.current / 2 - (measurements.closedCenter.y + measurements.closedSize.y / 2) * s + 45 * pxToWorldRef.current;

    const zoomTarget = computeZoomTarget(W, H, isMobile);
    targetScaleRef.current = zoomTarget.targetScale;
    targetGroupYRef.current = zoomTarget.targetGroupY;
    targetGroupZRef.current = zoomTarget.targetGroupZ;

    if (isMobile) {
      invalidate();
    }
  }, [measurements, scale, isMobile, W, H]);

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
  useFrame(({ camera }) => {
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

    const baseShadowOp = isMobile ? 0.5 : 0.65;
    let currentY: number;
    let currentLidRotX: number;
    let currentRotX: number;
    let currentZ = 0;
    let currentScale = scale;
    let shadowOp = 0;
    let screenGlow = 0;

    if (progress <= 0.28) {
      // 0.00–0.28: Rise phase driven 1:1 by actual scroll distance
      currentY = riseWorldY;
      const riseDist = Math.max(0.001, closedCenterY - startY);
      const riseT = Math.min(1, Math.max(0, (currentY - startY) / riseDist));
      currentRotX = THREE.MathUtils.lerp(START_ROT_X, CENTER_ROT_X, riseT);
      currentLidRotX = LID_CLOSED_ROT;
      currentScale = scale;
      currentZ = 0;
      shadowOp = riseT * baseShadowOp;
      screenGlow = 0;
    } else if (progress <= 0.68) {
      // 0.28–0.68: Lid opening phase (smoothly opens to fully open MacBook)
      const openT = (progress - 0.28) / 0.40;
      const easeT = openT < 0.5 ? 2 * openT * openT : 1 - Math.pow(-2 * openT + 2, 2) / 2;

      currentLidRotX = THREE.MathUtils.lerp(LID_CLOSED_ROT, LID_OPEN_ROT, easeT);
      currentY = THREE.MathUtils.lerp(closedCenterY, openCenterY, easeT);
      currentRotX = CENTER_ROT_X;
      currentZ = easeT * 0.3;
      currentScale = scale;
      shadowOp = baseShadowOp;
      screenGlow = easeT * 0.4;
    } else if (progress <= 0.74) {
      // 0.68–0.74: Hold open MacBook state (Reference Image 2)
      currentLidRotX = LID_OPEN_ROT;
      currentY = openCenterY;
      currentRotX = CENTER_ROT_X;
      currentZ = 0.3;
      currentScale = scale;
      shadowOp = baseShadowOp;
      screenGlow = 0.4;
    } else {
      // 0.74–1.00: Screen Expansion phase into close-up state (Reference Image 1)
      const ep = Math.min(1, Math.max(0, (progress - 0.74) / 0.20)); // reaches 1.0 at 0.94, holds 0.94-1.00
      const expandT = ep < 0.5 ? 2 * ep * ep : 1 - Math.pow(-2 * ep + 2, 2) / 2;

      currentLidRotX = THREE.MathUtils.lerp(LID_OPEN_ROT, Math.PI / 2, expandT);
      currentY = THREE.MathUtils.lerp(openCenterY, targetGroupYRef.current, expandT);
      currentRotX = CENTER_ROT_X;
      currentZ = THREE.MathUtils.lerp(0.3, targetGroupZRef.current, expandT);
      currentScale = THREE.MathUtils.lerp(scale, targetScaleRef.current, expandT);
      shadowOp = THREE.MathUtils.lerp(baseShadowOp, 0.0, expandT);
      screenGlow = THREE.MathUtils.lerp(0.4, 0.0, expandT);
    }

    // Direct ref updates - no allocations
    laptopGroupRef.current.position.set(0, currentY, currentZ);
    laptopGroupRef.current.rotation.set(currentRotX, 0, 0);
    laptopGroupRef.current.scale.setScalar(currentScale);

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

    // ── Project display plane corners to CSS screen coordinates for MacDock ──
    if (displayPlaneRef.current && screenRectRef) {
      const dp = displayPlaneRef.current;
      dp.updateMatrixWorld(true);

      // Display plane is 30.375 × 19.627, centered at origin in its local space
      const hw = 30.375 / 2;
      const hh = 19.627 / 2;

      // 4 corners in local plane coords (plane is rotated -PI/2 around X)
      // Local space of displayPlane: X right, Y into screen (after rotation), Z up (after rotation)
      // Actually since PlaneGeometry vertices are in XY and the plane has rotation.x = -PI/2,
      // the local XY maps to world XZ. We need the world positions of the 4 corners.
      const corners = _projCorners;
      corners[0].set(-hw, -hh, 0); // bottom-left in local plane
      corners[1].set( hw, -hh, 0); // bottom-right
      corners[2].set(-hw,  hh, 0); // top-left
      corners[3].set( hw,  hh, 0); // top-right

      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;

      const canvasW = size.width;
      const canvasH = size.height;

      for (let i = 0; i < 4; i++) {
        // Transform local corner to world, then project to NDC
        _projVec.copy(corners[i]);
        dp.localToWorld(_projVec);
        _projVec.project(camera);

        // NDC (-1..1) to CSS pixels
        const sx = ( _projVec.x * 0.5 + 0.5) * canvasW;
        const sy = (-_projVec.y * 0.5 + 0.5) * canvasH;

        if (sx < minX) minX = sx;
        if (sx > maxX) maxX = sx;
        if (sy < minY) minY = sy;
        if (sy > maxY) maxY = sy;
      }

      // Determine visibility: screen should be sufficiently open (lid > ~45°)
      // The lid is fully open when progress > 0.48 (midpoint of open phase)
      const dockVisible = progress > 0.48 && (maxX - minX) > 30;

      const sr = screenRectRef.current;
      if (!sr) {
        screenRectRef.current = {
          left: minX,
          top: minY,
          width: maxX - minX,
          height: maxY - minY,
          scale: currentScale / scale,
          visible: dockVisible,
        };
      } else {
        sr.left = minX;
        sr.top = minY;
        sr.width = maxX - minX;
        sr.height = maxY - minY;
        sr.scale = currentScale / scale;
        sr.visible = dockVisible;
      }
    }
  });

  // Only return early (lights only) when completely uninitialized — for both mobile and desktop.
  // On mobile: the group itself must always mount so laptopGroupRef.current is non-null when
  // the setup useEffect runs to measure and position the model. Visibility is controlled below.
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

  // Hide the model until it has been positioned at its correct bottom-peek
  // starting coordinate. This prevents the 1-frame "drop from top" glitch on ALL devices
  // without blocking the group from mounting (which would cause measurements to never be set).
  const modelVisible = Boolean(isReady && measurements);

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

      {/* Laptop Group — always mounted so ref is available for measurement, starts offscreen */}
      <group
        ref={laptopGroupRef}
        dispose={null}
        visible={modelVisible}
        position={[0, -50, 0]}
        scale={[0.001, 0.001, 0.001]}
      >
        <primitive object={scene} />
      </group>

      {/* Soft ContactShadows under the laptop - baked to 1 frame on mobile */}
      <group
        ref={shadowGroupRef}
        visible={modelVisible}
        position={[0, -50, 0]}
      >
        <ContactShadows
          position={[0, 0, 0]}
          opacity={isMobile ? 0.5 : 0.65}
          scale={16.5}
          blur={contactShadowBlur}
          far={4}
          resolution={shadowResolution}
          frames={isMobile ? (isReady && !!measurements ? 1 : 0) : undefined}
          smooth={!isMobile}
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
  const screenRectRef = useRef<ScreenRect | null>(null);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  });
  const [isEducationOpen, setIsEducationOpen] = useState(false);
  const [isSiriOpen, setIsSiriOpen] = useState(false);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);

  // References for mobile demand-driven scroll rendering pump
  const scrollPumpActiveRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerMobileScrollRender = useCallback(() => {
    if (!isMobile) return;
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
      invalidate(); // Ensure the final settled position is rendered
    }, 120);
  }, [isMobile]);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        invalidate();
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile, { passive: true });
    return () => {
      window.removeEventListener("resize", checkMobile);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Keep scrollYRef in sync via passive listener — triggers frame pump on mobile
  useEffect(() => {
    const onScroll = () => {
      scrollYRef.current = window.scrollY;
      if (isMobile) {
        triggerMobileScrollRender();
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isMobile, triggerMobileScrollRender]);

  const handleModelLoaded = React.useCallback(() => {
    // Defer refresh to avoid layout thrash on model load
    requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      if (isMobile) {
        invalidate();
      }
    });
  }, [isMobile]);

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
          if (isMobile) {
            triggerMobileScrollRender();
          }
        },
        refreshPriority: 1,
      });
    }, containerRef.current || undefined);

    return () => {
      ctx.revert();
    };
  }, [isMobile, triggerMobileScrollRender]);

  // Desktop: [1, 2] (untouched).
  // Mobile: [1, 2] — cap at 2× so a 3× screen renders at 2× rather than 1.5×.
  // The extra fill-rate cost of going 1.5→2 is modest (~33% more pixels on the
  // fraction of frames that actually render) but the sharpness gain is large.
  const canvasDpr = (isMobile ? [1, 2] : [1, 2]) as [number, number];

  return (
    // Tall scroll wrapper (~300vh) driving the 3D scene animation
    <div ref={containerRef} className="relative w-full h-[300vh] pointer-events-none">
      {/* Fixed transparent canvas layered over ASCII background */}
      <div
        className="fixed inset-0 w-full h-[100dvh] pointer-events-none z-10 overflow-hidden"
        style={{
          background: "transparent",
          contain: isMobile ? "strict" : undefined,
          transform: isMobile ? "translateZ(0)" : undefined,
        }}
      >
        <Canvas
          frameloop={isMobile ? "demand" : "always"}
          gl={{
            alpha: true,
            antialias: true, // Keep antialias on mobile — cheapest way to sharpen
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
              screenRectRef={screenRectRef}
            />
          </Suspense>
        </Canvas>
        <MacDock
          screenRectRef={screenRectRef}
          isMobile={isMobile}
          onOpenEducation={() => setIsEducationOpen((prev) => !prev)}
          isEducationOpen={isEducationOpen}
          onOpenSiri={() => setIsSiriOpen((prev) => !prev)}
          isSiriOpen={isSiriOpen}
          onOpenProjects={() => setIsProjectsOpen((prev) => !prev)}
          isProjectsOpen={isProjectsOpen}
        />
        <EducationWindow
          isOpen={isEducationOpen}
          onClose={() => setIsEducationOpen(false)}
          screenRectRef={screenRectRef}
          isMobile={isMobile}
        />
        <SiriAI
          isOpen={isSiriOpen}
          onClose={() => setIsSiriOpen(false)}
          screenRectRef={screenRectRef}
          isMobile={isMobile}
        />
        <ProjectsFinder
          isOpen={isProjectsOpen}
          onClose={() => setIsProjectsOpen(false)}
          screenRectRef={screenRectRef}
          isMobile={isMobile}
        />
      </div>
    </div>
  );
}
