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

      <div className="relative z-10 flex flex-col items-center justify-center text-center -translate-y-8 sm:-translate-y-12 md:-translate-y-14 gap-16 sm:gap-20 md:gap-24">
        {/* Typewriter Text on top with locked container height to prevent layout shift */}
        <div className="flex items-center justify-center h-12 sm:h-18 md:h-18 lg:h-20">
          <h1
            className={`${arcadeFont.className} text-xl sm:text-2xl md:text-[28px] lg:text-[40px] tracking-wider leading-none drop-shadow-[0_4px_16px_rgba(255,255,255,0.15)] whitespace-nowrap`}
          >
            <MinimalTypewriter />
          </h1>
        </div>

      
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

          {/* Bio Info*/}
          <div
            className="flex flex-col items-center text-center gap-2 sm:gap-2.5"
            style={{
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "SF Pro", system-ui, sans-serif',
            }}
          >
            <h2 className="text-[26px] sm:text-3xl md:text-4xl font-bold tracking-[-0.025em] text-[#F5F5F7] leading-tight">
              I&apos;am Dharmik Sarvaiya
            </h2>
            <div className="flex flex-col items-center gap-0 leading-tight">
              <p className="text-[17px] sm:text-lg font-normal tracking-[-0.01em] text-[#E6E4DE]/80 leading-snug">
                Pursuing Bachelor of Engineering
              </p>
              <p className="text-[15px] sm:text-base font-normal tracking-normal text-[#0073ed]/50 leading-snug">
                @RRIT Bengaluru
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
