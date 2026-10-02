"use client";

import React, { useEffect, useRef, useCallback, useState } from "react";

// ============================================================================
// MacDock — Premium macOS Liquid Glass Dock
// Self-contained component: all markup, styling, icons, hover/magnification,
// tooltips, and interaction logic live here.
//
// Integration: MacbookHero passes screenRectRef each frame with the
// projected screen bounding box in CSS pixels. MacDock positions itself
// inside that box at the bottom center.
//
// Performance:
//  - No React state for pointer movement
//  - GPU-composited transforms only (translate3d + scale)
//  - Pointer capability detection: hover logic skipped on touch devices
//  - Runtime PNG normalization: measured ONCE per image, cached, zero RAF overhead
//  - Cleanup: all listeners removed on unmount
// ============================================================================

export interface ScreenRect {
  left: number;
  top: number;
  width: number;
  height: number;
  /** Overall scale of the screen (1 = full size) — used to scale dock proportionally */
  scale: number;
  /** Whether the screen is visible enough to show the dock */
  visible: boolean;
}

// ── App definitions (the 6 macOS apps) ───────────────────────────────────────

interface DockApp {
  id: string;
  label: string;
  src: string;
  href?: string;
  isSquircle?: boolean;
}

const DOCK_APPS: DockApp[] = [
  { id: "finder",   label: "Projects",     src: "/dock/finder.png",   isSquircle: true },
  { id: "mail",     label: "Mail",         src: "/dock/mail.png",     isSquircle: true, href: "mailto:dharmik.be@gmail.com" },
  { id: "linkedin", label: "LinkedIn",     src: "/dock/linkedin.png", isSquircle: true, href: "https://www.linkedin.com/in/dharmiksarvaiya/" },
  { id: "github",   label: "GitHub",       src: "/dock/github.png",   isSquircle: true, href: "https://github.com/Dharmiksarvaiya24/" },
  { id: "siri-ai",  label: "Dharmik AI",   src: "/dock/siri.png",     isSquircle: false },
  { id: "pages",    label: "Education",    src: "/dock/pages.png",    isSquircle: true },
  { id: "trash",    label: "Trash",        src: "/dock/trash.png",    isSquircle: false },
];

// ── Dock dimensions & magnification constants ───────────────────────────────
const BASE_ICON_SIZE = 40;     // px — compact base icon box size
const TARGET_ARTWORK_PX = 34;  // px — identical target visible artwork bounding size (85% fill)
const MAX_SCALE = 1.30;        // subtle, smooth magnification
const INFLUENCE_RANGE = 1.85;  // neighbor influence range
const LIFT_PX = 5;             // max upward lift in px

// ── Runtime PNG Artwork Normalization & Caching ─────────────────────────────
interface NormalizedArtwork {
  scale: number;
  translateX: number;
  translateY: number;
}

// Precomputed exact artwork bounds measured from source PNG files (alpha > 15)
// Guarantees instant accurate scale and zero-flicker on first render without relying solely on canvas.
const PRECOMPUTED_BOUNDS: Record<string, { w: number; h: number; minX: number; minY: number; maxX: number; maxY: number }> = {
  "/dock/finder.png":   { w: 872, h: 872, minX: 16, minY: 14, maxX: 856, maxY: 856 },
  "/dock/mail.png":     { w: 462, h: 462, minX: 0,  minY: 0,  maxX: 461, maxY: 461 },
  "/dock/linkedin.png": { w: 512, h: 512, minX: 0,  minY: 0,  maxX: 511, maxY: 511 },
  "/dock/github.png":   { w: 512, h: 512, minX: 0,  minY: 0,  maxX: 511, maxY: 511 },
  "/dock/siri.png":     { w: 148, h: 148, minX: 13, minY: 19, maxX: 135, maxY: 139 },
  "/dock/pages.png":    { w: 320, h: 320, minX: 1,  minY: 2,  maxX: 319, maxY: 319 },
  "/dock/trash.png":    { w: 128, h: 128, minX: 18, minY: 14, maxX: 112, maxY: 121 },
};

function computeArtworkTransform(
  w: number,
  h: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): NormalizedArtwork {
  const artW = Math.max(1, maxX - minX + 1);
  const artH = Math.max(1, maxY - minY + 1);
  const artCenterX = (minX + maxX + 1) / 2;
  const artCenterY = (minY + maxY + 1) / 2;

  // Visual size of artwork if image were rendered at 100% in BASE_ICON_SIZE (40px)
  const visibleArtSizeAt100 = (Math.max(artW, artH) / Math.max(w, h)) * BASE_ICON_SIZE;
  const scale = TARGET_ARTWORK_PX / Math.max(0.1, visibleArtSizeAt100);

  // Shift needed to center non-transparent artwork in the icon box
  const translateX = ((w / 2 - artCenterX) / w) * BASE_ICON_SIZE * scale;
  const translateY = ((h / 2 - artCenterY) / h) * BASE_ICON_SIZE * scale;

  return { scale, translateX, translateY };
}

const normCache = new Map<string, NormalizedArtwork>();

// Seed cache with precomputed values
for (const [path, b] of Object.entries(PRECOMPUTED_BOUNDS)) {
  normCache.set(path, computeArtworkTransform(b.w, b.h, b.minX, b.minY, b.maxX, b.maxY));
}

// Untainted asynchronous analyzer for dynamic or updated PNGs
async function analyzeDynamicPNG(src: string): Promise<NormalizedArtwork> {
  const pathname = src.startsWith("http") ? new URL(src).pathname : src;
  if (normCache.has(pathname)) return normCache.get(pathname)!;
  if (normCache.has(src)) return normCache.get(src)!;

  try {
    const res = await fetch(src);
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);
    const w = bitmap.width;
    const h = bitmap.height;

    const maxDim = 120;
    const s = Math.min(1, maxDim / Math.max(w, h));
    const sw = Math.max(1, Math.round(w * s));
    const sh = Math.max(1, Math.round(h * s));

    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return computeArtworkTransform(w, h, 0, 0, w - 1, h - 1);

    ctx.drawImage(bitmap, 0, 0, sw, sh);
    const imgData = ctx.getImageData(0, 0, sw, sh).data;

    let minX = sw, maxX = -1, minY = sh, maxY = -1;
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const alpha = imgData[(y * sw + x) * 4 + 3];
        if (alpha > 15) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < minX || maxY < minY) {
      return computeArtworkTransform(w, h, 0, 0, w - 1, h - 1);
    }

    const realMinX = (minX / sw) * w;
    const realMaxX = ((maxX + 1) / sw) * w - 1;
    const realMinY = (minY / sh) * h;
    const realMaxY = ((maxY + 1) / sh) * h - 1;

    const result = computeArtworkTransform(w, h, realMinX, realMinY, realMaxX, realMaxY);
    normCache.set(pathname, result);
    normCache.set(src, result);
    return result;
  } catch {
    const fallback = computeArtworkTransform(512, 512, 0, 0, 511, 511);
    normCache.set(pathname, fallback);
    return fallback;
  }
}

// ── Normalized Icon Component ───────────────────────────────────────────────
const NormalizedIcon = React.memo(function NormalizedIcon({
  src,
  alt,
  isSquircle,
}: {
  src: string;
  alt: string;
  isSquircle?: boolean;
}) {
  const [norm, setNorm] = useState<NormalizedArtwork>(() => {
    return normCache.get(src) || computeArtworkTransform(512, 512, 0, 0, 511, 511);
  });

  useEffect(() => {
    let active = true;
    analyzeDynamicPNG(src).then((res) => {
      if (active) setNorm(res);
    });
    return () => {
      active = false;
    };
  }, [src]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: isSquircle ? "22%" : "0",
        overflow: "visible",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <img
        src={src}
        alt={alt}
        crossOrigin="anonymous"
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          userSelect: "none",
          pointerEvents: "none",
          transformOrigin: "center center",
          transform: `translate3d(${norm.translateX.toFixed(2)}px, ${norm.translateY.toFixed(2)}px, 0) scale(${norm.scale.toFixed(3)})`,
          willChange: "transform",
        }}
      />
    </div>
  );
});

// ── MacDock Component ────────────────────────────────────────────────────────

export interface MacDockProps {
  /** Ref that MacbookHero writes screen rect into every frame */
  screenRectRef: React.MutableRefObject<ScreenRect | null>;
  isMobile: boolean;
}

export default function MacDock({ screenRectRef, isMobile }: MacDockProps) {
  const dockRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rafIdRef = useRef<number | null>(null);

  // ── Position the dock to match the 3D screen rect ──────────────────────
  const updatePosition = useCallback(() => {
    const dock = dockRef.current;
    const rect = screenRectRef.current;
    if (!dock || !rect) return;

    if (!rect.visible || rect.width < 10) {
      dock.style.opacity = "0";
      dock.style.pointerEvents = "none";
      return;
    }

    dock.style.opacity = "1";
    dock.style.pointerEvents = "auto";

    // Compact dock scaling
    const refWidth = 540;
    const dockScale = Math.min(1.05, Math.max(0.3, rect.width / refWidth));

    // Position: bottom center of the screen rect, sitting close to the bottom bezel
    const bottomPadding = rect.height * 0.018;
    const dockBottom = rect.top + rect.height - bottomPadding;
    const dockCenterX = rect.left + rect.width / 2;

    dock.style.transform = `translate3d(${dockCenterX}px, ${dockBottom}px, 0) translate(-50%, -100%) scale(${dockScale})`;
  }, [screenRectRef]);

  // ── Sync position on animation frame ──────────────────────────────────
  useEffect(() => {
    let running = true;

    const tick = () => {
      if (!running) return;
      updatePosition();
      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      running = false;
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [updatePosition]);

  // ── Hover magnification (desktop only, direct DOM) ─────────────────────
  // Multiplies with the inner normalizedBaseScale:
  // finalScale = normalizedBaseScale * existingHoverScale
  useEffect(() => {
    if (isMobile) return;
    if (typeof window !== "undefined" && !window.matchMedia("(hover: hover)").matches) return;

    const dock = dockRef.current;
    if (!dock) return;

    const items = itemRefs.current;

    const resetAll = () => {
      for (let i = 0; i < items.length; i++) {
        const el = items[i];
        if (el) {
          el.style.transform = "translate3d(0,0,0) scale(1)";
        }
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      const dockRect = dock.getBoundingClientRect();
      const margin = 40;
      if (
        e.clientY < dockRect.top - margin ||
        e.clientY > dockRect.bottom + margin ||
        e.clientX < dockRect.left - margin ||
        e.clientX > dockRect.right + margin
      ) {
        resetAll();
        return;
      }

      for (let i = 0; i < items.length; i++) {
        const el = items[i];
        if (!el) continue;

        const itemRect = el.getBoundingClientRect();
        const itemCenterX = itemRect.left + itemRect.width / 2;

        const distance = Math.abs(e.clientX - itemCenterX) / (itemRect.width || 1);

        let s: number;
        let lift: number;

        if (distance < INFLUENCE_RANGE) {
          const t = distance / INFLUENCE_RANGE;
          const factor = Math.cos(t * Math.PI * 0.5);
          const power = factor * factor;
          s = 1 + (MAX_SCALE - 1) * power;
          lift = -LIFT_PX * power;
        } else {
          s = 1;
          lift = 0;
        }

        el.style.transform = `translate3d(0, ${lift}px, 0) scale(${s})`;
      }
    };

    const handlePointerLeave = () => {
      resetAll();
    };

    dock.addEventListener("pointermove", handlePointerMove, { passive: true });
    dock.addEventListener("pointerleave", handlePointerLeave, { passive: true });

    return () => {
      dock.removeEventListener("pointermove", handlePointerMove);
      dock.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [isMobile]);

  return (
    <div
      ref={dockRef}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        zIndex: 15,
        pointerEvents: "none",
        transformOrigin: "center bottom",
        willChange: "transform",
        opacity: 0,
        transition: "opacity 0.3s ease",
      }}
      aria-label="macOS Dock"
      role="toolbar"
    >
      {/* Dock glass container — Sleek & Compact Liquid Glass (UNCHANGED) */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: "8px",
          padding: "5px 12px 6px",
          borderRadius: "14px",
          // Liquid Glass surface
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.09) 100%)",
          backdropFilter: "blur(28px) saturate(200%)",
          WebkitBackdropFilter: "blur(28px) saturate(200%)",
          // Subtle inner border + highlight
          border: "0.5px solid rgba(255,255,255,0.32)",
          // Glass shadow stack
          boxShadow: [
            "0 8px 28px rgba(0,0,0,0.38)",
            "0 2px 8px rgba(0,0,0,0.20)",
            "inset 0 1px 0 rgba(255,255,255,0.35)",
            "inset 0 -0.5px 0 rgba(0,0,0,0.1)",
          ].join(", "),
        }}
      >
        {DOCK_APPS.map((app, index) => (
          <React.Fragment key={app.id}>
            {/* Native macOS separator line before Trash */}
            {app.id === "trash" && (
              <div
                data-dock-divider="true"
                style={{
                  width: "1px",
                  height: "26px",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.36) 50%, rgba(255,255,255,0.05) 100%)",
                  margin: "0 2px",
                  alignSelf: "center",
                  flexShrink: 0,
                  borderRadius: "1px",
                  boxShadow: "0 0 1px rgba(0,0,0,0.4)",
                  pointerEvents: "none",
                }}
                aria-hidden="true"
              />
            )}
            {/* Dock item — identical fixed outer container */}
            <div
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              data-dock-item={app.id}
              onClick={() => {
                if (app.href) {
                  if (app.href.startsWith("mailto:")) {
                    window.location.href = app.href;
                  } else {
                    window.open(app.href, "_blank", "noopener,noreferrer");
                  }
                }
              }}
              style={{
                width: `${BASE_ICON_SIZE}px`,
                height: `${BASE_ICON_SIZE}px`,
                cursor: "pointer",
                transition: "transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
                transformOrigin: "center bottom",
                position: "relative",
                flexShrink: 0,
              }}
              title={app.label}
              role="button"
              aria-label={app.label}
            >
              {/* Fixed alignment box */}
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  pointerEvents: "none",
                  filter:
                    app.id === "trash"
                      ? "none"
                      : "drop-shadow(0 1.5px 3px rgba(0,0,0,0.28))",
                }}
              >
                {/* Normalized icon artwork — normalized to identical visual size */}
                <NormalizedIcon
                  src={app.src}
                  alt={app.label}
                  isSquircle={app.isSquircle}
                />
              </div>

              {/* Tooltip — shown on hover via CSS sibling selector */}
              <div
                className="dock-tooltip-label"
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 6px)",
                  left: "50%",
                  transform: "translateX(-50%) translateY(4px)",
                  opacity: 0,
                  pointerEvents: "none",
                  whiteSpace: "nowrap",
                  padding: "3px 9px",
                  borderRadius: "5px",
                  background: "rgba(30, 30, 30, 0.88)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  color: "#f5f5f7",
                  fontSize: "10.5px",
                  fontFamily:
                    '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif',
                  fontWeight: 500,
                  letterSpacing: "0.01em",
                  border: "0.5px solid rgba(255,255,255,0.15)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                  transition:
                    "opacity 0.15s ease, transform 0.15s ease",
                }}
              >
                {app.label}
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* CSS for tooltip hover — scoped to dock items */}
      <style>{`
        [data-dock-item]:hover .dock-tooltip-label {
          opacity: 1 !important;
          transform: translateX(-50%) translateY(0px) !important;
        }
      `}</style>
    </div>
  );
}
