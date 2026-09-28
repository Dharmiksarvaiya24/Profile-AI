import Image from "next/image";
import LightRays from "@/components/LightRays";
import MinimalTypewriter from "@/components/MinimalTypewriter";
import MacbookWrapper from "@/components/MacbookWrapper";
import { Press_Start_2P, JetBrains_Mono } from "next/font/google";

const arcadeFont = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
});

export default function Home() {
  return (
    <main className="relative w-full select-none">
      <MacbookWrapper />

      {/* LightRays fills the entire viewport behind content responsively */}
      <div className="fixed inset-0 w-full h-[100dvh] pointer-events-none z-0 overflow-hidden">
        <LightRays
          raysOrigin="top-center"
          raysColor="#0073ed"
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

      {/* Hero container that scrolls up and away normally */}
      <div
        id="hero-content"
        className="absolute top-0 left-0 w-full min-h-[100dvh] z-20 flex flex-col items-center justify-center text-center px-6 sm:px-12 md:px-24 pointer-events-none"
      >
        <div className="pointer-events-auto flex flex-col items-center justify-center text-center -translate-y-8 sm:-translate-y-12 md:-translate-y-14 gap-16 sm:gap-20 md:gap-24">
          {/* Typewriter Text on top with locked container height to prevent layout shift */}
          <div className="flex items-center justify-center h-12 sm:h-18 md:h-18 lg:h-20 -translate-y-16 sm:translate-y-0">
            <h1
              className={`${arcadeFont.className} text-[28px] sm:text-2xl md:text-[28px] lg:text-[40px] tracking-wider leading-none drop-shadow-[0_4px_16px_rgba(255,255,255,0.15)] whitespace-nowrap`}
            >
              <MinimalTypewriter />
            </h1>
          </div>

          <div className="flex flex-col items-center gap-6 sm:gap-7">
            {/* Round Profile Picture with soft blue glow and gradient ring */}
            <div className="relative w-32 h-32 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full p-[2px] bg-gradient-to-b from-[#0073ed]/70 via-[#0073ed]/20 to-transparent shadow-[0_0_32px_rgba(0,115,237,0.32),0_8px_32px_rgba(0,0,0,0.6)]">
              {/* Ambient soft blue glow halo */}
              <div className="absolute -inset-1.5 rounded-full bg-gradient-to-b from-[#0073ed]/35 via-[#0073ed]/15 to-transparent blur-md -z-10 pointer-events-none" />
              <div className="relative w-full h-full rounded-full overflow-hidden border border-[#0073ed]/30 bg-[#121214]">
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

            {/* Bio Info*/}
            <div
              className="flex flex-col items-center text-center gap-2 sm:gap-2.5"
              style={{
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "SF Pro", system-ui, sans-serif',
              }}
            >
              <span
                className={`${monoFont.className} text-[13px] sm:text-[14px] font-medium text-[#4A9EFF] tracking-wide select-none`}
              >
                &gt; whoami
              </span>
              <h2 className="text-[30px] sm:text-3xl md:text-4xl font-normal tracking-[-0.02em] text-[#F5F5F7] leading-tight">
                I&apos;m Dharmik Sarvaiya
              </h2>
              <div className="flex flex-col items-center gap-0 leading-tight">
                <p className="text-[19px] sm:text-lg font-normal tracking-[-0.01em] text-[#E6E4DE]/80 leading-snug">
                  Pursuing Bachelor of Engineering
                </p>
                <p className="text-[16px] sm:text-base font-normal tracking-normal text-[#0073ed]/50 leading-snug">
                  @RRIT Bengaluru
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
