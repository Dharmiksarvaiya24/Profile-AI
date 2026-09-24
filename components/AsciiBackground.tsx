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
  cellSize = 24,
  mouseRadius = 140,
  charSet = DEFAULT_CHARS,
  opacity = 1,
}: AsciiBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number }>({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    let grid: string[][] = [];
    let animationFrameId: number;
    let intervalId: NodeJS.Timeout;

    const isMobile = window.innerWidth < 768;
    const actualCellSize = isMobile ? Math.max(16, cellSize - 6) : cellSize;

    const initGrid = () => {
      width = window.innerWidth;
      height = window.innerHeight;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
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

          // Mouse proximity boost
          const dx = x - mouseX;
          const dy = y - mouseY;
          const distMouse = Math.sqrt(dx * dx + dy * dy);
          const mouseBoost = Math.max(0, 1 - distMouse / mouseRadius) * 0.55;

          // Spotlight / cone lighting from top center
          // Higher brightness in upper center, softly spreading out and fading to edges
          const relX = (x - centerX) / (width * 0.55);
          const relY = y / (height * 0.85);
          const radialDist = Math.sqrt(relX * relX + relY * relY * 0.6);
          const ambientCone = Math.max(0, 1 - radialDist * 0.85);

          // Combined alpha matching reference image
          // Baseline subtle presence + spotlight illumination + mouse interaction
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

    initGrid();
    draw();

    // Occasional subtle mutation of characters (alive feel)
    intervalId = setInterval(() => {
      if (document.hidden) return;
      const mutationCount = Math.floor(cols * rows * 0.02) + 1;
      for (let i = 0; i < mutationCount; i++) {
        const r = Math.floor(Math.random() * rows);
        const c = Math.floor(Math.random() * cols);
        if (grid[r]) {
          grid[r][c] = charSet[Math.floor(Math.random() * charSet.length)];
        }
      }
      draw();
    }, isMobile ? 240 : 150);

    const handlePointerMove = (e: PointerEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      animationFrameId = requestAnimationFrame(draw);
    };

    const handlePointerLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 };
      animationFrameId = requestAnimationFrame(draw);
    };

    const handleResize = () => {
      initGrid();
      draw();
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerleave", handlePointerLeave);
    window.addEventListener("resize", handleResize);

    return () => {
      clearInterval(intervalId);
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
      window.removeEventListener("resize", handleResize);
    };
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
