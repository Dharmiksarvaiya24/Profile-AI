"use client";

import { useState } from "react";
import LightRays from "@/components/LightRays";

export default function LightRaysWrapper() {
  // Lazy initializer: runs once synchronously on the client at mount.
  // No setState, no re-render, no WebGL teardown/reinit cycle.
  const [mobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768 || navigator.maxTouchPoints > 0;
  });

  return (
    <LightRays
      raysOrigin="top-center"
      raysColor="#0073ed"
      raysSpeed={mobile ? 1.3 : 1.7}
      lightSpread={mobile ? 0.9 : 1.1}
      rayLength={mobile ? 1.3 : 1.9}
      followMouse={false}
      mouseInfluence={0}
      noiseAmount={mobile ? 0 : 0.25}
      distortion={mobile ? 0 : 0.06}
      fadeDistance={mobile ? 1.6 : 2.4}
      saturation={0}
    />
  );
}
