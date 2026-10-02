"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { ScreenRect } from "./MacDock";
import { EDUCATION_DATA, PROFESSION_DATA } from "@/data/educationData";

export interface EducationWindowProps {
  isOpen: boolean;
  onClose: () => void;
  screenRectRef: React.MutableRefObject<ScreenRect | null>;
  isMobile: boolean;
}

type WindowState = "normal" | "maximized" | "minimized";

export default function EducationWindow({
  isOpen,
  onClose,
  screenRectRef,
  isMobile,
}: EducationWindowProps) {
  const [windowState, setWindowState] = useState<WindowState>("normal");
  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isTrafficHovered, setIsTrafficHovered] = useState(false);

  // Dragging state
  const dragRef = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    initialLeft: 0,
    initialTop: 0,
  });

  const [windowPos, setWindowPos] = useState<{ x: number | null; y: number | null }>({
    x: null,
    y: null,
  });

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

  // Handle open/close animations
  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setWindowState("normal");
      // Short delay for entrance transition
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 20);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => {
        setIsRendered(false);
        setWindowPos({ x: null, y: null });
      }, 220);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Run position sync RAF only while rendered and visible
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

  // Traffic lights actions
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

  // Window dragging within screen boundaries
  const handlePointerDown = (e: React.PointerEvent) => {
    if (windowState === "maximized") return;
    const win = windowRef.current;
    const container = containerRef.current;
    if (!win || !container) return;

    const winRect = win.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      initialLeft: winRect.left - containerRect.left,
      initialTop: winRect.top - containerRect.top,
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.isDragging || windowState === "maximized") return;
    const container = containerRef.current;
    const win = windowRef.current;
    if (!container || !win) return;

    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;

    const maxLeft = Math.max(0, container.clientWidth - win.clientWidth);
    const maxTop = Math.max(30, container.clientHeight - win.clientHeight - 50);

    const newLeft = Math.min(maxLeft, Math.max(0, dragRef.current.initialLeft + deltaX));
    const newTop = Math.min(maxTop, Math.max(28, dragRef.current.initialTop + deltaY));

    setWindowPos({ x: newLeft, y: newTop });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragRef.current.isDragging) {
      dragRef.current.isDragging = false;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // pointer capture release fallback
      }
    }
  };

  // Prevent internal scroll events from bubbling to main page
  const handleContentWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
  };

  if (!isRendered) return null;

  // Window sizing styles
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
        zIndex: 13, // Below MacDock (z-index 15), above Canvas
        willChange: "transform, width, height",
        opacity: 0,
        transition: "opacity 0.2s ease",
      }}
    >
      {/* Floating macOS Notes Window */}
      <div
        ref={windowRef}
        style={{
          position: "absolute",
          ...(isMax
            ? {
                left: "12px",
                top: "32px",
                width: "calc(100% - 24px)",
                height: "calc(100% - 94px)",
              }
            : {
                left: windowPos.x !== null ? `${windowPos.x}px` : "50%",
                top: windowPos.y !== null ? `${windowPos.y}px` : "46%",
                transform:
                  windowPos.x !== null
                    ? "none"
                    : "translate(-50%, -50%)",
                width: isMobile ? "92%" : "min(460px, 64%)",
                height: isMobile ? "78%" : "min(530px, 75%)",
              }),
          background: "rgba(30, 30, 32, 0.96)",
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
        }}
      >
        {/* Title Bar / Header (Draggable) */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            height: "44px",
            minHeight: "44px",
            background: "rgba(38, 38, 42, 0.8)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 14px",
            cursor: "default",
          }}
        >
          {/* Left: Traffic Lights & Title */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
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

            {/* Title */}
            <span
              style={{
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif',
                fontSize: "13px",
                fontWeight: 600,
                color: "#E5E5EA",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: isMobile ? "110px" : "170px",
              }}
            >
              Educational background
            </span>
          </div>

          {/* Right Toolbar: Capsule with Action Icons matching Reference */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* Action pill */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "8px",
                padding: "3px 10px",
                height: "26px",
              }}
            >
              {/* Aa format */}
              <span
                style={{
                  fontFamily:
                    '-apple-system, BlinkMacSystemFont, "SF Pro Text", serif',
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "rgba(255, 255, 255, 0.8)",
                  cursor: "default",
                }}
                title="Format"
              >
                Aa
              </span>

              {/* Checklist Icon */}
              <svg
                width="13"
                height="13"
                viewBox="0 0 16 16"
                fill="none"
                stroke="rgba(255, 255, 255, 0.8)"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="4" cy="5" r="2.5" />
                <path d="M9 5h5M9 11h5" />
                <circle cx="4" cy="11" r="2.5" />
              </svg>

              {/* Table / Grid Icon (Desktop/Tablet) */}
              {!isMobile && (
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.8)"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="2" width="12" height="12" rx="2" />
                  <path d="M2 8h12M8 2v12" />
                </svg>
              )}

              {/* Paperclip / Attachment (Desktop/Tablet) */}
              {!isMobile && (
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.8)"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M13.5 7.5l-6 6a3.5 3.5 0 01-5-5l6-6a2.5 2.5 0 013.5 3.5l-6 6a1.5 1.5 0 01-2-2l5-5" />
                </svg>
              )}
            </div>

            {/* More button >> */}
            <div
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "50%",
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(255, 255, 255, 0.8)",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "default",
              }}
              title="More"
            >
              »
            </div>
          </div>
        </div>

        {/* Window Content Body (Independent native vertical scrolling) */}
        <div
          onWheel={handleContentWheel}
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            overscrollBehavior: "contain",
            padding: "18px 24px 28px 24px",
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", sans-serif',
            color: "#E5E5EA",
            userSelect: "none",
            cursor: "default",
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(255, 255, 255, 0.22) transparent",
          }}
        >
          {/* Note Timestamp */}
          <div
            style={{
              textAlign: "center",
              fontSize: "11.5px",
              fontWeight: 500,
              color: "#8E8E93",
              marginBottom: "18px",
            }}
          >
            Updated on 3 October 2026 at 12:46 AM
          </div>

          {/* Section 1: Education Background */}
          <div style={{ marginBottom: "26px" }}>
            <h2
              style={{
                fontSize: "20px",
                fontWeight: 700,
                letterSpacing: "-0.015em",
                color: "#FFFFFF",
                margin: "0 0 14px 0",
              }}
            >
              Education Background
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              {EDUCATION_DATA.map((item, idx) => (
                <div key={idx} style={{ lineHeight: 1.45 }}>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#E5E5EA",
                    }}
                  >
                    {item.degree}
                  </div>
                  <div style={{ fontSize: "13.5px", color: "#A1A1A6" }}>
                    {item.periodOrGraduation}
                  </div>
                  <div style={{ fontSize: "13.5px", color: "#A1A1A6" }}>
                    {item.institution}, {item.location}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Profession Background */}
          <div>
            <h2
              style={{
                fontSize: "20px",
                fontWeight: 700,
                letterSpacing: "-0.015em",
                color: "#FFFFFF",
                margin: "0 0 14px 0",
              }}
            >
              Profession Background
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              {PROFESSION_DATA.map((item, idx) => (
                <div key={idx} style={{ lineHeight: 1.45 }}>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#E5E5EA",
                    }}
                  >
                    {item.role}
                  </div>
                  <div style={{ fontSize: "13.5px", color: "#A1A1A6" }}>
                    {item.company}
                  </div>
                  <div style={{ fontSize: "13.5px", color: "#A1A1A6" }}>
                    {item.period}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Global style tag for scrollbar styling without polluting globals */}
        <style jsx>{`
          div::-webkit-scrollbar {
            width: 6px;
          }
          div::-webkit-scrollbar-track {
            background: transparent;
          }
          div::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.22);
            border-radius: 3px;
          }
          div::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.38);
          }
        `}</style>
      </div>
    </div>
  );
}
