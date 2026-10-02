"use client";

import React, { useEffect, useRef, useCallback } from "react";

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

// ── App definitions using real icons from /public/dock/ ──────────────────────

interface DockApp {
  id: string;
  label: string;
  src: string;
  href?: string;
  /** Optical scale factor to ensure all icons have balanced perceived size */
  scale?: number;
}

const DOCK_APPS: DockApp[] = [
  { id: "finder",   label: "Projects",       src: "/dock/finder.png",   scale: 1.04 },
  { id: "linkedin", label: "LinkedIn",     src: "/dock/linkedin.svg", scale: 0.88, href: "https://linkedin.com" },
  { id: "github",   label: "GitHub",       src: "/dock/github.svg",   scale: 0.88, href: "https://github.com" },
  { id: "siri-ai",  label: "Dharmik AI",   src: "/dock/siri.png",     scale: 1.18 },
  { id: "pages",    label: "Education",    src: "/dock/pages.png",    scale: 1.00 },
  { id: "trash",    label: "Trash",        src: "/dock/trash.png",    scale: 0.95 },
];

// ── Dock dimensions & magnification constants ───────────────────────────────
const BASE_ICON_SIZE = 40;     // px — compact base icon size for a smaller dock
const MAX_SCALE = 1.30;        // subtle, smooth magnification
const INFLUENCE_RANGE = 1.85;  // neighbor influence range
const LIFT_PX = 5;             // max upward lift in px

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
    const bottomPadding = rect.height * 0.018; // moved lower toward bottom edge
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
      {/* Dock glass container — Sleek & Compact Liquid Glass */}
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
            <div
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              data-dock-item={app.id}
              onClick={() => {
                if (app.href) {
                  window.open(app.href, "_blank", "noopener,noreferrer");
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
              {/* Icon Container */}
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: app.id === "trash" ? "0" : "22%",
                  overflow: app.id === "trash" ? "visible" : "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  filter:
                    app.id === "trash"
                      ? "none"
                      : "drop-shadow(0 1.5px 3px rgba(0,0,0,0.3))",
                }}
              >
                <img
                  src={app.src}
                  alt={app.label}
                  draggable={false}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    userSelect: "none",
                    pointerEvents: "none",
                    transform: app.scale ? `scale(${app.scale})` : undefined,
                  }}
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
