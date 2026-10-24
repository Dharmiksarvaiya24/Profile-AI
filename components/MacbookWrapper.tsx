"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const MacbookHero = dynamic(() => import("./MacbookHero"), {
  ssr: false,
  loading: () => null,
});

const IPhoneHero = dynamic(() => import("./IPhoneHero"), {
  ssr: false,
  loading: () => null,
});

export default function MacbookWrapper() {
  const [shouldRender, setShouldRender] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check, { passive: true });
    return () => window.removeEventListener("resize", check);
  }, []);

  // Mount the 3D Canvas only once the section is near the viewport (800px margin)
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin: "800px" }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Preload the GLB + 3D chunk on idle so it never blocks initial render
  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      if (isMobile) {
        import("./IPhoneHero");
        import("@react-three/drei").then((drei) => {
          if (cancelled) return;
          drei.useGLTF.preload("/iphone_18.glb");
          drei.useEnvironment.preload({ files: "/potsdamer_platz_1k.hdr" });
        });
      } else {
        import("./MacbookHero");
        import("@react-three/drei").then((drei) => {
          if (cancelled) return;
          drei.useGLTF.preload("/mac.glb");
          drei.useEnvironment.preload({ files: "/potsdamer_platz_1k.hdr" });
        });
      }
    };
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(run);
      return () => {
        cancelled = true;
        w.cancelIdleCallback?.(id);
      };
    }
    const t = setTimeout(run, 1);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [isMobile]);

  return (
    <div ref={containerRef} className="relative w-full">
      {shouldRender ? (
        isMobile ? (
          <IPhoneHero />
        ) : (
          <MacbookHero />
        )
      ) : (
        <div
          className="relative w-full pointer-events-none"
          style={{ height: isMobile ? "280vh" : "300vh" }}
        />
      )}
    </div>
  );
}
