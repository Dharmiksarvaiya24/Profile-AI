"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { ScreenRect } from "./MacDock";
import ProjectsContent from "./ProjectsContent";
import { PROJECTS_DATA } from "../data/projectsData";

export interface ProjectsFinderProps {
  isOpen: boolean;
  onClose: () => void;
  screenRectRef: React.MutableRefObject<ScreenRect | null>;
  isMobile: boolean;
}

type WindowState = "normal" | "maximized" | "minimized";

export default function ProjectsFinder({
  isOpen,
  onClose,
  screenRectRef,
  isMobile,
}: ProjectsFinderProps) {
  const [windowState, setWindowState] = useState<WindowState>("normal");
  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<string>("root");
  const [isTrafficHovered, setIsTrafficHovered] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);

  // ── Sync screen position with MacBook 3D screen ──────────────────────────
  const updateScreenPosition = useCallback(() => {
    const container = containerRef.current;
    const rect = screenRectRef.current;
    if (!container || !rect) return;

    if (!rect.visible || rect.width < 10) {
      container.style.opacity = "0";
      container.style.pointerEvents = "none";
      return;
    }

    container.style.opacity = "1";
    container.style.pointerEvents = "auto";
    container.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0)`;
    container.style.width = `${rect.width}px`;
    container.style.height = `${rect.height}px`;
  }, [screenRectRef]);

  // Entrance & Exit animations
  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setWindowState("normal");
      setCurrentFolder("root");
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 20);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => {
        setIsRendered(false);
        setCurrentFolder("root");
      }, 220);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // RAF sync only when rendered
  useEffect(() => {
    if (!isRendered) return;

    let active = true;
    const tick = () => {
      if (!active) return;
      updateScreenPosition();
      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      active = false;
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [isRendered, updateScreenPosition]);

  // Traffic lights handlers
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setWindowState("minimized");
  };

  const handleToggleMaximize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setWindowState((prev) => (prev === "maximized" ? "normal" : "maximized"));
  };

  if (!isRendered) return null;

  const isMax = windowState === "maximized";
  const isMin = windowState === "minimized";

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        overflow: "hidden",
        borderRadius: "14px",
        zIndex: 13, // Below MacDock (z-index 15)
        willChange: "transform, width, height",
        opacity: 0,
        transition: "opacity 0.2s ease",
      }}
    >
      {/* Floating macOS Finder Window */}
      <div
        ref={windowRef}
        style={{
          position: "absolute",
          ...(isMax
            ? {
                left: "10px",
                top: isMobile ? "24px" : "32px",
                width: "calc(100% - 20px)",
                height: isMobile ? "calc(100% - 74px)" : "calc(100% - 94px)",
              }
            : {
                left: "50%",
                top: "46%",
                transform: "translate(-50%, -50%)",
                width: isMobile ? "92%" : "min(520px, 72%)",
                height: isMobile ? "80%" : "min(380px, 68%)",
              }),
          background: "rgba(30, 30, 34, 0.96)",
          backdropFilter: "blur(40px) saturate(180%)",
          WebkitBackdropFilter: "blur(40px) saturate(180%)",
          borderRadius: "12px",
          border: "1px solid rgba(255, 255, 255, 0.14)",
          boxShadow: [
            "0 22px 60px rgba(0,0,0,0.65)",
            "0 6px 18px rgba(0,0,0,0.40)",
            "inset 0 1px 0 rgba(255,255,255,0.18)",
          ].join(", "),
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          pointerEvents: isMin ? "none" : "auto",
          opacity: isVisible && !isMin ? 1 : 0,
          scale: isVisible && !isMin ? "1" : "0.92",
          transformOrigin: "center center",
          transition:
            "opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1), scale 0.22s cubic-bezier(0.16, 1, 0.3, 1), width 0.25s ease, height 0.25s ease, top 0.25s ease, left 0.25s ease",
          willChange: "transform, opacity",
          userSelect: "none",
          cursor: "default",
        }}
      >
        {/* Finder Header / Toolbar */}
        <div
          style={{
            height: "44px",
            minHeight: "44px",
            background: "rgba(38, 38, 42, 0.85)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 14px",
          }}
        >
          {/* Left: Traffic Lights & Navigation Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* macOS Traffic Lights */}
            <div
              onMouseEnter={() => setIsTrafficHovered(true)}
              onMouseLeave={() => setIsTrafficHovered(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {/* Close (Red) */}
              <button
                onClick={handleClose}
                aria-label="Close window"
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  backgroundColor: "#FF5F56",
                  border: "0.5px solid #E0443E",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  padding: 0,
                  outline: "none",
                }}
              >
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 800,
                    lineHeight: 1,
                    color: "rgba(0, 0, 0, 0.65)",
                    opacity: isTrafficHovered ? 1 : 0,
                    transition: "opacity 0.15s ease",
                  }}
                >
                  ✕
                </span>
              </button>

              {/* Minimize (Yellow) */}
              <button
                onClick={handleMinimize}
                aria-label="Minimize window"
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  backgroundColor: "#FFBD2E",
                  border: "0.5px solid #DEA123",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  padding: 0,
                  outline: "none",
                }}
              >
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 900,
                    lineHeight: 1,
                    color: "rgba(0, 0, 0, 0.65)",
                    opacity: isTrafficHovered ? 1 : 0,
                    transform: "translateY(-1px)",
                    transition: "opacity 0.15s ease",
                  }}
                >
                  –
                </span>
              </button>

              {/* Maximize (Green) */}
              <button
                onClick={handleToggleMaximize}
                aria-label="Maximize window"
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  backgroundColor: "#27C93F",
                  border: "0.5px solid #1AAB29",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  padding: 0,
                  outline: "none",
                }}
              >
                <span
                  style={{
                    fontSize: "8px",
                    fontWeight: 800,
                    lineHeight: 1,
                    color: "rgba(0, 0, 0, 0.65)",
                    opacity: isTrafficHovered ? 1 : 0,
                    transition: "opacity 0.15s ease",
                  }}
                >
                  {isMax ? "⤡" : "⤢"}
                </span>
              </button>
            </div>

            {/* Back & Forward Navigation Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
              <button
                onClick={() => setCurrentFolder("root")}
                disabled={currentFolder === "root"}
                aria-label="Back to Projects"
                style={{
                  width: "24px",
                  height: "22px",
                  borderRadius: "4px",
                  backgroundColor: "transparent",
                  border: "none",
                  color:
                    currentFolder !== "root"
                      ? "rgba(255, 255, 255, 0.85)"
                      : "rgba(255, 255, 255, 0.25)",
                  fontSize: "13px",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: currentFolder !== "root" ? "pointer" : "default",
                  outline: "none",
                  transition: "background-color 0.15s ease",
                }}
              >
                ‹
              </button>
              <button
                disabled
                aria-label="Forward"
                style={{
                  width: "24px",
                  height: "22px",
                  borderRadius: "4px",
                  backgroundColor: "transparent",
                  border: "none",
                  color: "rgba(255, 255, 255, 0.25)",
                  fontSize: "13px",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  outline: "none",
                }}
              >
                ›
              </button>
            </div>

            {/* Title / Breadcrumbs */}
            <span
              style={{
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif',
                fontSize: "13px",
                fontWeight: 600,
                color: "#E5E5EA",
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              {currentFolder === "root" ? (
                "Projects"
              ) : (
                <>
                  <span
                    onClick={() => setCurrentFolder("root")}
                    style={{ cursor: "pointer", opacity: 0.7 }}
                  >
                    Projects
                  </span>
                  <span style={{ opacity: 0.4 }}>›</span>
                  <span>
                    {PROJECTS_DATA.find((p) => p.slug === currentFolder)
                      ?.displayName || currentFolder}
                  </span>
                </>
              )}
            </span>
          </div>

          {/* Right Toolbar: View mode buttons & Search pill */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* View switcher pill (Icon/List) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                borderRadius: "6px",
                padding: "2px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              {/* Grid view icon (active) */}
              <div
                style={{
                  width: "20px",
                  height: "18px",
                  borderRadius: "4px",
                  backgroundColor: "rgba(255, 255, 255, 0.16)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" color="#FFFFFF">
                  <rect x="0" y="0" width="4" height="4" rx="1" />
                  <rect x="6" y="0" width="4" height="4" rx="1" />
                  <rect x="0" y="6" width="4" height="4" rx="1" />
                  <rect x="6" y="6" width="4" height="4" rx="1" />
                </svg>
              </div>
            </div>

            {/* Subtle Search Pill (Desktop/Tablet) */}
            {!isMobile && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  backgroundColor: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "6px",
                  padding: "3px 8px",
                  height: "22px",
                  fontSize: "11px",
                  color: "rgba(255, 255, 255, 0.4)",
                }}
              >
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="6.5" cy="6.5" r="4.5" />
                  <path d="M10 10l4 4" />
                </svg>
                <span>Search</span>
              </div>
            )}
          </div>
        </div>

        {/* Finder Main Content Area */}
        <div
          style={{
            flex: 1,
            display: "flex",
            overflow: "hidden",
          }}
        >
          {/* Left Sidebar (macOS style favorites) — compact width & spacing */}
          {!isMobile && (
            <div
              style={{
                width: "108px",
                backgroundColor: "rgba(24, 24, 28, 0.65)",
                borderRight: "1px solid rgba(255, 255, 255, 0.06)",
                padding: "8px 5px",
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                fontSize: "11px",
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif',
              }}
            >
              <div
                style={{
                  fontSize: "9.5px",
                  fontWeight: 600,
                  color: "rgba(255, 255, 255, 0.35)",
                  padding: "0 4px 2px 4px",
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                }}
              >
                Favorites
              </div>

              {/* Active Projects Item */}
              <div
                onClick={() => setCurrentFolder("root")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "3px 6px",
                  borderRadius: "5px",
                  backgroundColor:
                    currentFolder === "root"
                      ? "rgba(0, 113, 227, 0.28)"
                      : "transparent",
                  color: currentFolder === "root" ? "#FFFFFF" : "rgba(255, 255, 255, 0.7)",
                  fontWeight: currentFolder === "root" ? 600 : 400,
                  cursor: "pointer",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="#0071E3">
                  <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h3.764a1.5 1.5 0 0 1 1.06.44L8.765 3.9A.5.5 0 0 0 9.12 4H13.5A1.5 1.5 0 0 1 15 5.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9z" />
                </svg>
                <span>Projects</span>
              </div>

              {/* Recents */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "3px 6px",
                  borderRadius: "5px",
                  color: "rgba(255, 255, 255, 0.45)",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="8" cy="8" r="6" />
                  <path d="M8 5v3l2 2" />
                </svg>
                <span>Recents</span>
              </div>

              {/* Applications */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "3px 6px",
                  borderRadius: "5px",
                  color: "rgba(255, 255, 255, 0.45)",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="2" y="2" width="12" height="12" rx="2.5" />
                  <path d="M5 8h6M8 5v6" />
                </svg>
                <span>Applications</span>
              </div>
            </div>
          )}

          {/* Right: Main File View */}
          <div
            style={{
              flex: 1,
              padding: isMobile ? "12px 14px" : "16px 20px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif',
            }}
          >
            <ProjectsContent
              currentFolder={currentFolder}
              onSelectFolder={(slug) => setCurrentFolder(slug)}
              onBackToRoot={() => setCurrentFolder("root")}
              isMobile={isMobile}
            />
          </div>
        </div>

        {/* Finder Status Bar */}
        <div
          style={{
            height: "22px",
            minHeight: "22px",
            background: "rgba(32, 32, 36, 0.9)",
            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            color: "rgba(255, 255, 255, 0.4)",
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif',
          }}
        >
          {currentFolder === "root"
            ? `${PROJECTS_DATA.length} items, 256 GB available`
            : "1 item, 256 GB available"}
        </div>
      </div>
    </div>
  );
}
