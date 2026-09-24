import Image from "next/image";
import LightRays from "@/components/LightRays";
import MinimalTypewriter from "@/components/MinimalTypewriter";
import { Press_Start_2P } from "next/font/google";

const arcadeFont = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
});

export default function Home() {
  return (
    <main className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center px-6 py-12 sm:px-12 md:px-24 overflow-x-hidden">
      {/* LightRays fills the entire viewport behind content responsively */}
      <div className="fixed inset-0 w-full h-[100dvh] pointer-events-none z-0 overflow-hidden">
        <LightRays
          raysOrigin="top-center"
          raysColor="#ffffff"
          raysSpeed={1.4}
          lightSpread={0.85}
          rayLength={1.4}
          followMouse={false}
          mouseInfluence={0}
          noiseAmount={0.2}
          distortion={0.04}
          fadeDistance={1.8}
          saturation={0}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center text-center -translate-y-8 sm:-translate-y-12 md:-translate-y-14 gap-16 sm:gap-20 md:gap-24">
        {/* Typewriter Text on top with locked container height to prevent layout shift */}
        <div className="flex items-center justify-center h-12 sm:h-16 md:h-20">
          <h1
            className={`${arcadeFont.className} text-2xl sm:text-4xl md:text-5xl lg:text-6xl tracking-wider leading-none drop-shadow-[0_4px_16px_rgba(255,255,255,0.15)] whitespace-nowrap`}
          >
            <MinimalTypewriter />
          </h1>
        </div>

        {/* Profile & Social Icons Section */}
        <div className="flex flex-col items-center gap-6 sm:gap-7">
          {/* Round Profile Picture */}
          <div className="relative w-32 h-32  sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full p-[2px] bg-gradient-to-b from-white/20 via-white/5 to-transparent shadow-[0_8px_32px_rgba(0,0,0,0.55)]">
            <div className="relative w-full h-full rounded-full overflow-hidden border border-white/10 bg-[#121214]">
              <Image
                src="/profile.jpg"
                alt="Profile"
                width={144}
                height={144}
                priority
                className="w-full h-full object-cover rounded-full select-none"
              />
            </div>
          </div>

          {/* Social Links: GitHub, X, LinkedIn, Mail */}
          <div className="flex items-center justify-center gap-4 sm:gap-5">
            <a
              href="https://github.com/Dharmiksarvaiya24/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="p-2.5 sm:p-3 rounded-full bg-white/[0.04] border border-white/10 text-[#E6E4DE]/75 hover:text-[#E6E4DE] hover:border-white/30 hover:bg-white/[0.08] hover:scale-110 active:scale-95 transition-all duration-200"
            >
              <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" viewBox="0 0 24 24" fill="currentColor">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
            </a>

            <a
              href="https://x.com/dk__sarvaiya"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X (Twitter)"
              className="p-2.5 sm:p-3 rounded-full bg-white/[0.04] border border-white/10 text-[#E6E4DE]/75 hover:text-[#E6E4DE] hover:border-white/30 hover:bg-white/[0.08] hover:scale-110 active:scale-95 transition-all duration-200"
            >
              <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>

            <a
              href="https://www.linkedin.com/in/dharmiksarvaiya/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="p-2.5 sm:p-3 rounded-full bg-white/[0.04] border border-white/10 text-[#E6E4DE]/75 hover:text-[#E6E4DE] hover:border-white/30 hover:bg-white/[0.08] hover:scale-110 active:scale-95 transition-all duration-200"
            >
              <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76c.92 0 1.66-.74 1.66-1.66s-.74-1.66-1.66-1.66a1.66 1.66 0 0 0-1.66 1.66c0 .92.74 1.66 1.66 1.66m1.39 9.74v-8.37H5.07v8.37h2.78z" />
              </svg>
            </a>

            <a
              href="mailto:dharmik.be@gmail.com"
              aria-label="Mail"
              className="p-2.5 sm:p-3 rounded-full bg-white/[0.04] border border-white/10 text-[#E6E4DE]/75 hover:text-[#E6E4DE] hover:border-white/30 hover:bg-white/[0.08] hover:scale-110 active:scale-95 transition-all duration-200"
            >
              <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
