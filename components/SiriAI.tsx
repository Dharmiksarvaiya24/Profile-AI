"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { ScreenRect } from "./MacDock";
import SiriChat from "./SiriChat";

export interface SiriAIProps {
  isOpen: boolean;
  onClose: () => void;
  screenRectRef: React.MutableRefObject<ScreenRect | null>;
  isMobile: boolean;
}

type WindowState = "normal" | "maximized" | "minimized";

export default function SiriAI({
  isOpen,
  onClose,
  screenRectRef,
  isMobile,
}: SiriAIProps) {
  const [windowState, setWindowState] = useState<WindowState>("normal");
  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isTrafficHovered, setIsTrafficHovered] = useState(false);
  const [windowPos, setWindowPos] = useState<{ x: number | null; y: number | null }>({
    x: null,
    y: null,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);
  const dragRef = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    initialLeft: number;
    initialTop: number;
  }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    initialLeft: 0,
    initialTop: 0,
  });

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

  // Entrance & Exit transitions
  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setWindowState("normal");
      setWindowPos({ x: null, y: null });
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 20);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => {
        setIsRendered(false);
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

  // Draggable window within screen boundaries
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
        // fallback
      }
    }
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
        zIndex: 14, // Below MacDock (z-index 15), above Canvas
        willChange: "transform, width, height",
        opacity: 0,
        transition: "opacity 0.2s ease",
      }}
    >
      {/* Floating macOS Siri AI Window */}
      <div
        ref={windowRef}
        style={{
          position: "absolute",
          ...(isMax
            ? {
                left: "12px",
                top: isMobile ? "24px" : "32px",
                width: "calc(100% - 24px)",
                height: isMobile ? "calc(100% - 74px)" : "calc(100% - 94px)",
              }
            : {
                left: windowPos.x !== null ? `${windowPos.x}px` : "50%",
                top: windowPos.y !== null ? `${windowPos.y}px` : "46%",
                transform:
                  windowPos.x !== null
                    ? "none"
                    : "translate(-50%, -50%)",
                width: isMobile ? "95%" : "min(600px, 80%)",
                height: isMobile ? "86%" : "min(460px, 76%)",
              }),
          background: "rgba(0, 0, 0, 0.98)",
          backdropFilter: "blur(40px) saturate(180%)",
          WebkitBackdropFilter: "blur(40px) saturate(180%)",
          borderRadius: isMobile ? "12px" : "16px",
          border: "1px solid rgba(255, 255, 255, 0.12)",
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
        {/* Title Bar / Header (Draggable) */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            height: isMobile ? "34px" : "42px",
            minHeight: isMobile ? "34px" : "42px",
            background: "rgba(10, 10, 12, 0.95)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: isMobile ? "0 10px" : "0 14px",
            cursor: "default",
          }}
        >
          {/* Left: Traffic Lights & Title */}
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "8px" : "14px" }}>
            {/* macOS Traffic Lights */}
            <div
              onMouseEnter={() => setIsTrafficHovered(true)}
              onMouseLeave={() => setIsTrafficHovered(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: isMobile ? "6px" : "8px",
              }}
            >
              {/* Close (Red) */}
              <button
                onClick={handleClose}
                aria-label="Close window"
                style={{
                  width: isMobile ? "10px" : "12px",
                  height: isMobile ? "10px" : "12px",
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
                    fontSize: isMobile ? "8px" : "9px",
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
                  width: isMobile ? "10px" : "12px",
                  height: isMobile ? "10px" : "12px",
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
                    fontSize: isMobile ? "9px" : "10px",
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
                  width: isMobile ? "10px" : "12px",
                  height: isMobile ? "10px" : "12px",
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
                    fontSize: isMobile ? "7px" : "8px",
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
                fontSize: isMobile ? "11.5px" : "13px",
                fontWeight: 600,
                color: "rgba(255, 255, 255, 0.88)",
                letterSpacing: "-0.01em",
              }}
            >
              Dharmik AI
            </span>
          </div>

          {/* Right: Model badge Pixel v1.0 & Optional Clear Button */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: isMobile ? "2px 7px" : "3px 9px",
                fontSize: isMobile ? "9.5px" : "11px",
                fontWeight: 500,
                color: "rgba(255, 255, 255, 0.7)",
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif',
                letterSpacing: "-0.01em",
                userSelect: "none",
              }}
            >
              Pixel v1.0
            </div>
          </div>
        </div>

        {/* Window Interior: Siri Chat Box */}
        <SiriChat isMobile={isMobile} />
      </div>
    </div>
  );
}
