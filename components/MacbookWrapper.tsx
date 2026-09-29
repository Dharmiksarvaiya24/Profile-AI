"use client";
 
import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useGLTF } from "@react-three/drei";

const MacbookHero = dynamic(() => import("./MacbookHero"), {
  ssr: false,
});

export default function MacbookWrapper() {
  const [shouldRender, setShouldRender] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Idle preload of GLB model
    const preloadModel = () => {
      useGLTF.preload("/mac.glb");
    };

    if (typeof window !== "undefined") {
      if ("requestIdleCallback" in window) {
        (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(preloadModel);
      } else {
        setTimeout(preloadModel, 1200);
      }
    }

    // IntersectionObserver to only mount 3D Canvas when near viewport (800px margin)
    if (!containerRef.current) {
      setShouldRender(true);
      return;
    }

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

