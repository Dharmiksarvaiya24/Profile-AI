"use client";

import React, { createContext, useContext, useState } from "react";
import AsciiBackground from "./AsciiBackground";

export interface BackgroundConfig {
  baseColor: string;
  opacity: number;
  baseFrequency: number | string;
  numOctaves: number;
  blendMode: React.CSSProperties["mixBlendMode"];
  showAscii?: boolean;
}

export const DEFAULT_BACKGROUND_CONFIG: BackgroundConfig = {
  baseColor: "#0a0a0c",
  opacity: 0.14,
  baseFrequency: 0.85,
  numOctaves: 4,
  blendMode: "overlay",
  showAscii: true,
};

interface BackgroundContextType {
  config: BackgroundConfig;
  setConfig: React.Dispatch<React.SetStateAction<BackgroundConfig>>;
  updateConfig: (partial: Partial<BackgroundConfig>) => void;
  resetConfig: () => void;
}

const BackgroundContext = createContext<BackgroundContextType | undefined>(undefined);

export function useBackground() {
  const context = useContext(BackgroundContext);
  if (!context) {
    throw new Error("useBackground must be used within a BackgroundProvider");
  }
  return context;
}

export interface BackgroundProps extends Partial<BackgroundConfig> {
  filterId?: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Procedural deep dark background with subtle spotlight glow,
 * interactive ASCII character matrix, and fine matte film grain texture.
 */
export function Background({
  baseColor,
  opacity,
  baseFrequency,
  numOctaves,
  blendMode,
  showAscii,
  filterId = "matte-grain-filter",
  className = "",
  children,
}: BackgroundProps) {
 
  const context = useContext(BackgroundContext);

  const resolvedBaseColor = baseColor ?? context?.config.baseColor ?? DEFAULT_BACKGROUND_CONFIG.baseColor;
  const resolvedOpacity = opacity ?? context?.config.opacity ?? DEFAULT_BACKGROUND_CONFIG.opacity;
  const resolvedFreq = baseFrequency ?? context?.config.baseFrequency ?? DEFAULT_BACKGROUND_CONFIG.baseFrequency;
  const resolvedOctaves = numOctaves ?? context?.config.numOctaves ?? DEFAULT_BACKGROUND_CONFIG.numOctaves;
  const resolvedBlendMode = blendMode ?? context?.config.blendMode ?? DEFAULT_BACKGROUND_CONFIG.blendMode;
  const resolvedShowAscii = showAscii ?? context?.config.showAscii ?? DEFAULT_BACKGROUND_CONFIG.showAscii;

  return (
    <>
      <div
        className={`fixed inset-0 -z-50 pointer-events-none select-none overflow-hidden ${className}`}
        style={{ backgroundColor: resolvedBaseColor }}
        aria-hidden="true"
      >
        {/* Soft radial spotlight vignette from top center */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 55% at 50% 0%, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0) 70%), radial-gradient(circle at 50% 100%, rgba(18, 18, 22, 0.4) 0%, transparent 60%)",
          }}
        />

        {/* ASCII Character Scatter Background */}
        {resolvedShowAscii && (
          <AsciiBackground className="absolute inset-0 w-full h-full" />
        )}

        {/* Procedural film grain noise overlay */}
        <svg
          className="absolute inset-0 h-full w-full"
          style={{ opacity: resolvedOpacity, mixBlendMode: resolvedBlendMode }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <filter id={filterId} x="0%" y="0%" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency={resolvedFreq}
              numOctaves={resolvedOctaves}
              stitchTiles="stitch"
              result="noise"
            />
           
            <feColorMatrix
              type="matrix"
              values="0.3333 0.3333 0.3333 0 0
                      0.3333 0.3333 0.3333 0 0
                      0.3333 0.3333 0.3333 0 0
                      0      0      0      1 0"
              result="monoNoise"
            />
          </filter>
          <rect width="100%" height="100%" filter={`url(#${filterId})`} />
        </svg>
      </div>
      {children}
    </>
  );
}

export function BackgroundProvider({
  children,
  initialConfig,
}: {
  children: React.ReactNode;
  initialConfig?: Partial<BackgroundConfig>;
}) {
  const [config, setConfig] = useState<BackgroundConfig>({
    ...DEFAULT_BACKGROUND_CONFIG,
    ...initialConfig,
  });

  const updateConfig = (partial: Partial<BackgroundConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  };

  const resetConfig = () => {
    setConfig(DEFAULT_BACKGROUND_CONFIG);
  };

  return (
    <BackgroundContext.Provider value={{ config, setConfig, updateConfig, resetConfig }}>
      <Background />
      {children}
    </BackgroundContext.Provider>
  );
}

export default Background;
