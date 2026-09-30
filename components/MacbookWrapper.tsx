"use client";
 
import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useGLTF } from "@react-three/drei";

const MacbookHero = dynamic(() => import("./MacbookHero"), {
  ssr: false,
});

// Preload GLB via drei cache at module level
if (typeof window !== "undefined") {
  // Preload via drei cache
  if ("requestIdleCallback" in window) {
    (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(() => {
      useGLTF.preload("/mac.glb");
    });
  } else {
    setTimeout(() => useGLTF.preload("/mac.glb"), 100);
  }
}

export default function MacbookWrapper() {
  const [shouldRender, setShouldRender] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // IntersectionObserver to only mount 3D Canvas when near viewport (800px margin)
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldRender(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: "800px" }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      {shouldRender ? (
        <MacbookHero />
      ) : (
        <div className="relative w-full h-[300vh] pointer-events-none" />
      )}
    </div>
  );
}

