"use client";

import dynamic from "next/dynamic";

const MacbookHero = dynamic(() => import("./MacbookHero"), {
  ssr: false,
});

export default function MacbookWrapper() {
  return <MacbookHero />;
}
