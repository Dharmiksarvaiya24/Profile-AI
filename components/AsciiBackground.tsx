"use client";

import React, { useEffect, useRef } from "react";

interface AsciiBackgroundProps {
  className?: string;
  cellSize?: number;
  mouseRadius?: number;
  charSet?: string[];
  opacity?: number;
}

const DEFAULT_CHARS = [
  "0", "1", "+", "-", "*", ":", ".", "·",
  "A", "B", "D", "8", "9", "3", "4", "^",
  "|", "/", " ", " "
];

export function AsciiBackground({
  className = "",
  cellSize = 24,        // +18% for big screen (desktop: 24, mobile: strictly 18)
  mouseRadius = 140,
  charSet = DEFAULT_CHARS,
  opacity = 1,
}: AsciiBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number }>({ x: -9999, y: -9999 });
  // Use refs for animation control — avoids state-driven re-renders (item 5)
  const drawScheduledRef = useRef(false);
  const isVisibleRef = useRef(true);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Detect mobile/touch once at setup — width check + touch capability
    // navigator.maxTouchPoints > 0 catches touch tablets at any viewport width
    const isMobile = window.innerWidth < 768 || navigator.maxTouchPoints > 0;

    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    let grid: string[][] = [];

    // Mobile: strictly kept at 18 for mobile ASCII size, DPR=1 to keep perf
    const actualCellSize = isMobile ? 18 : cellSize;
    const dpr = isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    // +20% frequency: desktop 200→167ms, mobile 1000→833ms (item 4)
    const mutationInterval = isMobile ? 833 : 167;
    // Mobile: mutate fewer cells per tick to keep main thread free (item 5)
    const mutationFrac = isMobile ? 0.012 : 0.02;

    const initGrid = () => {
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      cols = Math.ceil(width / actualCellSize) + 1;
      rows = Math.ceil(height / actualCellSize) + 1;

      grid = [];
      for (let r = 0; r < rows; r++) {
        grid[r] = [];
        for (let c = 0; c < cols; c++) {
          grid[r][c] = charSet[Math.floor(Math.random() * charSet.length)];
        }
      }
    };

    const draw = () => {
      drawScheduledRef.current = false;
      if (!isVisibleRef.current) return;

      ctx.clearRect(0, 0, width, height);

      const fontSize = Math.floor(actualCellSize * 0.55);
      ctx.font = `${fontSize}px "JetBrains Mono", "SF Mono", ui-monospace, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const mouseX = mouseRef.current.x;
      const mouseY = mouseRef.current.y;
      const centerX = width / 2;

      for (let r = 0; r < rows; r++) {
        const y = r * actualCellSize + actualCellSize / 2;

        for (let c = 0; c < cols; c++) {
          const char = grid[r][c];
          if (!char || char === " ") continue;

          const x = c * actualCellSize + actualCellSize / 2;

          // Mouse proximity boost — desktop only
          let mouseBoost = 0;
          if (!isMobile && mouseX > -999) {
            const dx = x - mouseX;
            const dy = y - mouseY;
            const distSq = dx * dx + dy * dy;
            const radSq = mouseRadius * mouseRadius;
            if (distSq < radSq) {
              mouseBoost = Math.max(0, 1 - Math.sqrt(distSq) / mouseRadius) * 0.55;
            }
          }

          // Spotlight / cone lighting from top center
          const relX = (x - centerX) / (width * 0.55);
          const relY = y / (height * 0.85);
          const radialDist = Math.sqrt(relX * relX + relY * relY * 0.6);
          const ambientCone = Math.max(0, 1 - radialDist * 0.85);

          const baseAlpha = 0.07;
          const coneAlpha = ambientCone * 0.28;
          const totalAlpha = Math.min(0.85, (baseAlpha + coneAlpha + mouseBoost) * opacity);

          if (totalAlpha > 0.01) {
            ctx.fillStyle = `rgba(255, 255, 255, ${totalAlpha.toFixed(3)})`;
            ctx.fillText(char, x, y);
          }
        }
      }
    };

    const scheduleDraw = () => {
      if (!drawScheduledRef.current && isVisibleRef.current) {
        drawScheduledRef.current = true;
        animFrameRef.current = requestAnimationFrame(draw);
      }
    };

    initGrid();
    draw();

    // Mutation ticker — increased by 20% (item 4)
    const intervalId = setInterval(() => {
      if (document.hidden || !isVisibleRef.current) return;
      const mutationCount = Math.floor(cols * rows * mutationFrac) + 1;
      for (let i = 0; i < mutationCount; i++) {
        const r = Math.floor(Math.random() * rows);
        const c = Math.floor(Math.random() * cols);
        if (grid[r]) {
          grid[r][c] = charSet[Math.floor(Math.random() * charSet.length)];
        }
      }
      scheduleDraw();
    }, mutationInterval);

    // Hover listeners — desktop only (item 1: smooth pointer-based hover)
    const handlePointerMove = (e: PointerEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      scheduleDraw();
    };

    const handlePointerLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 };
      scheduleDraw();
    };

    if (!isMobile) {
      window.addEventListener("pointermove", handlePointerMove, { passive: true });
      window.addEventListener("pointerleave", handlePointerLeave);
    }

    // Resize handler — throttled to avoid layout thrash on mobile (item 5)
    let resizeTimeout: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        initGrid();
        scheduleDraw();
      }, isMobile ? 300 : 100);
    };
    window.addEventListener("resize", handleResize, { passive: true });

    // IntersectionObserver — ref-based, no state, no re-render (item 5)
    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            isVisibleRef.current = entry.isIntersecting;
            if (entry.isIntersecting) scheduleDraw();
          });
        },
        { threshold: 0.05, rootMargin: "100px" }
      );
      observer.observe(canvas);
    }

    // Listen to document visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden && isVisibleRef.current) {
        scheduleDraw();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      clearTimeout(resizeTimeout);
      cancelAnimationFrame(animFrameRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (!isMobile) {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerleave", handlePointerLeave);
      }
      window.removeEventListener("resize", handleResize);
      if (observer) observer.disconnect();
    };
    // cellSize, mouseRadius, charSet, opacity are intentionally the only outer deps —
    // all other values (isMobile, dpr, mutationInterval, etc.) are derived once at setup
    // and live inside the closure. Re-running on those would tear down the canvas unnecessarily.
  }, [cellSize, mouseRadius, charSet, opacity]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none select-none ${className}`}
      aria-hidden="true"
    />
  );
}

export default AsciiBackground;
