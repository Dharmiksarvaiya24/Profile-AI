"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { ScreenRect } from "./MacDock";

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
  const [currentFolder, setCurrentFolder] = useState<"root" | "demo">("root");
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
                    currentFolder === "demo"
                      ? "rgba(255, 255, 255, 0.85)"
                      : "rgba(255, 255, 255, 0.25)",
                  fontSize: "13px",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: currentFolder === "demo" ? "pointer" : "default",
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
              }}
            >
              {currentFolder === "root" ? "Projects" : "Projects › Demo"}
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
          {/* Left Sidebar (macOS style favorites) */}
          {!isMobile && (
            <div
              style={{
                width: "135px",
                backgroundColor: "rgba(24, 24, 28, 0.65)",
                borderRight: "1px solid rgba(255, 255, 255, 0.06)",
                padding: "12px 8px",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                fontSize: "11.5px",
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif',
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  color: "rgba(255, 255, 255, 0.35)",
                  padding: "0 6px 4px 6px",
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
                  gap: "7px",
                  padding: "5px 8px",
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
                  gap: "7px",
                  padding: "5px 8px",
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
                  gap: "7px",
                  padding: "5px 8px",
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
              padding: isMobile ? "14px 16px" : "20px 24px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif',
            }}
          >
            {currentFolder === "root" ? (
              /* Root: Shows the Demo Folder */
              <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
                <div
                  onClick={() => setCurrentFolder("demo")}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "6px",
                    width: "84px",
                    padding: "8px 6px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "background-color 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {/* macOS Blue Folder Icon */}
                  <div
                    style={{
                      width: "56px",
                      height: "46px",
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg
                      width="54"
                      height="44"
                      viewBox="0 0 64 52"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      {/* Back tab */}
                      <path
                        d="M4 10C4 6.68629 6.68629 4 10 4H23.5858C25.1771 4 26.7033 4.63214 27.8284 5.75736L31.4142 9.34315C32.1643 10.0932 33.1818 10.5147 34.2426 10.5147H54C57.3137 10.5147 60 13.201 60 16.5147V42C60 45.3137 57.3137 48 54 48H10C6.68629 48 4 45.3137 4 42V10Z"
                        fill="#0071E3"
                      />
                      {/* Folder front flap with subtle gradient */}
                      <path
                        d="M4 18C4 14.6863 6.68629 12 10 12H54C57.3137 12 60 14.6863 60 18V42C60 45.3137 57.3137 48 54 48H10C6.68629 48 4 45.3137 4 42V18Z"
                        fill="url(#folderGrad)"
                      />
                      <defs>
                        <linearGradient id="folderGrad" x1="32" y1="12" x2="32" y2="48" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#389BFF" />
                          <stop offset="1" stopColor="#0071E3" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>

                  {/* Folder Label */}
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "#FFFFFF",
                      textAlign: "center",
                      wordBreak: "break-word",
                    }}
                  >
                    Demo
                  </span>
                </div>
              </div>
            ) : (
              /* Inside Demo Folder */
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(255, 255, 255, 0.4)",
                  gap: "10px",
                }}
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 7V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7" />
                  <path d="M9 12h6M9 16h4" />
                </svg>
                <div style={{ fontSize: "13px", fontWeight: 500, color: "rgba(255, 255, 255, 0.6)" }}>
                  Placeholder folder for projects
                </div>
                <button
                  onClick={() => setCurrentFolder("root")}
                  style={{
                    marginTop: "6px",
                    padding: "4px 12px",
                    borderRadius: "6px",
                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#FFFFFF",
                    fontSize: "12px",
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  ‹ Back to Projects
                </button>
              </div>
            )}
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
          {currentFolder === "root" ? "1 item, 256 GB available" : "0 items, 256 GB available"}
        </div>
      </div>
    </div>
  );
}
