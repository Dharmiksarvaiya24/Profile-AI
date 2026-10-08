"use client";
 
import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useGLTF } from "@react-three/drei";

const MacbookHero = dynamic(() => import("./MacbookHero"), {
  ssr: false,
});

// Preload GLB via drei cache immediately at module level
if (typeof window !== "undefined") {
  useGLTF.preload("/mac.glb");
  // Prefetch the chunk immediately
  import("./MacbookHero");
}

export default function MacbookWrapper() {
  const [shouldRender, setShouldRender] = useState(true);
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

