"use client";

import dynamic from "next/dynamic";

// Lanyard pulls in three.js; load it client-only in its own chunk so it is
// not part of the initial JS of the home route.
const Lanyard = dynamic(() => import("./Lanyard"), {
  ssr: false,
  loading: () => null,
});

export default Lanyard;
