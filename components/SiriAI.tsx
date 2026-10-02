"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { ScreenRect } from "./MacDock";

export interface SiriAIProps {
  isOpen: boolean;
  onClose: () => void;
  screenRectRef: React.MutableRefObject<ScreenRect | null>;
  isMobile: boolean;
}

export default function SiriAI({
  isOpen,
  onClose,
  screenRectRef,
  isMobile,
}: SiriAIProps) {
  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
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

  // Entrance & Exit transitions
  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
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

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim()) return;
    // UI-only for now — no network request
    setInputValue("");
  };

  if (!isRendered) return null;

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
        zIndex: 14, // Under Dock (z-index 15), above screen content
        willChange: "transform, width, height",
        opacity: 0,
        transition: "opacity 0.22s ease",
      }}
    >
      {/* Siri AI Overlay Container */}
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(ellipse at center, rgba(14, 14, 20, 0.72) 0%, rgba(6, 6, 10, 0.88) 100%)",
          backdropFilter: "blur(24px) saturate(160%)",
          WebkitBackdropFilter: "blur(24px) saturate(160%)",
          opacity: isVisible ? 1 : 0,
          scale: isVisible ? "1" : "0.95",
          transformOrigin: "center center",
          transition: "opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1), scale 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
          willChange: "transform, opacity",
          userSelect: "none",
          paddingBottom: "48px", // Space above dock
        }}
      >
        {/* Subtle Close Button in top right of screen */}
        <button
          onClick={onClose}
          aria-label="Close Siri AI"
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            color: "rgba(255, 255, 255, 0.7)",
            fontSize: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            outline: "none",
            transition: "background-color 0.15s ease, color 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.16)";
            e.currentTarget.style.color = "#FFFFFF";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.08)";
            e.currentTarget.style.color = "rgba(255, 255, 255, 0.7)";
          }}
        >
          ✕
        </button>

        {/* Center: Coming Soon Title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "8px",
            marginBottom: isMobile ? "18px" : "28px",
          }}
        >
          {/* Glowing Apple Intelligence gradient text */}
          <h1
            style={{
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif',
              fontSize: isMobile ? "22px" : "32px",
              fontWeight: 700,
              letterSpacing: "-0.025em",
              background: "linear-gradient(135deg, #FF6B9E 0%, #C850C0 25%, #7367F0 50%, #4158D0 75%, #00D2FF 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              margin: 0,
              padding: "0 8px",
              filter: "drop-shadow(0 2px 14px rgba(200, 80, 192, 0.35))",
            }}
          >
            Coming Soon
          </h1>

          <p
            style={{
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif',
              fontSize: isMobile ? "11.5px" : "13.5px",
              fontWeight: 400,
              color: "#8E8E93",
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            Dharmik AI is currently in training.
          </p>
        </div>

        {/* Chat Box Wrapper with Apple Intelligence Multicolor Glow */}
        <div
          style={{
            position: "relative",
            width: isMobile ? "92%" : "min(440px, 84%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Soft multicolor ambient glow */}
          <div
            style={{
              position: "absolute",
              inset: "-3px",
              borderRadius: "28px",
              background: "linear-gradient(120deg, #FF4B72, #A855F7, #3B82F6, #06B6D4, #F59E0B, #FF4B72)",
              backgroundSize: "300% 300%",
              filter: "blur(10px)",
              opacity: 0.55,
              animation: "siriGlowFlow 8s ease infinite",
              pointerEvents: "none",
            }}
          />

          {/* Crisp border gradient */}
          <div
            style={{
              position: "absolute",
              inset: "-1px",
              borderRadius: "26px",
              background: "linear-gradient(120deg, rgba(255,75,114,0.7), rgba(168,85,247,0.7), rgba(59,130,246,0.7), rgba(6,182,212,0.7))",
              backgroundSize: "200% 200%",
              animation: "siriGlowFlow 8s ease infinite",
              pointerEvents: "none",
            }}
          />

          {/* Chat Box Interior */}
          <form
            onSubmit={handleSend}
            style={{
              position: "relative",
              width: "100%",
              height: isMobile ? "44px" : "50px",
              backgroundColor: "rgba(22, 22, 26, 0.94)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderRadius: "24px",
              display: "flex",
              alignItems: "center",
              padding: isMobile ? "0 6px 0 8px" : "0 8px 0 10px",
              gap: "8px",
              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 8px 24px rgba(0, 0, 0, 0.45)",
            }}
          >
            {/* Left: + Button */}
            <button
              type="button"
              aria-label="Add attachment"
              style={{
                width: isMobile ? "28px" : "30px",
                height: isMobile ? "28px" : "30px",
                borderRadius: "50%",
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.10)",
                color: "rgba(255, 255, 255, 0.8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                outline: "none",
                fontSize: "16px",
                fontWeight: 400,
                lineHeight: 1,
                flexShrink: 0,
                transition: "background-color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.16)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.08)";
              }}
            >
              +
            </button>

            {/* Center: Input with placeholder 'Dharmik AI' */}
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Dharmik AI"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif',
                fontSize: isMobile ? "13px" : "14px",
                color: "#FFFFFF",
                padding: "0 4px",
                minWidth: 0,
              }}
            />

            {/* Right: Send Button */}
            <button
              type="submit"
              aria-label="Send"
              style={{
                height: isMobile ? "28px" : "30px",
                padding: isMobile ? "0 10px" : "0 14px",
                borderRadius: "16px",
                backgroundColor: inputValue.trim() ? "#0071E3" : "rgba(255, 255, 255, 0.12)",
                border: "none",
                color: inputValue.trim() ? "#FFFFFF" : "rgba(255, 255, 255, 0.65)",
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif',
                fontSize: isMobile ? "11.5px" : "12.5px",
                fontWeight: 600,
                cursor: inputValue.trim() ? "pointer" : "default",
                outline: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "background-color 0.18s ease, color 0.18s ease",
              }}
            >
              Send
            </button>
          </form>
        </div>
      </div>

      {/* Lightweight CSS animation for subtle gradient flow */}
      <style jsx>{`
        @keyframes siriGlowFlow {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
    </div>
  );
}
