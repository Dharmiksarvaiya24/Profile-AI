import LightRaysWrapper from "@/components/LightRaysWrapper";
import MacbookWrapper from "@/components/MacbookWrapper";
import ScrollIndicator from "@/components/ScrollIndicator";
import Lanyard from "@/components/Lanyard";

export default function Home() {
  return (
    <main className="relative w-full select-none">
      <MacbookWrapper />

      {/* LightRays fills the entire viewport behind content responsively */}
      <div className="fixed inset-0 w-full h-[100dvh] pointer-events-none z-0 overflow-hidden">
        <LightRaysWrapper />
      </div>

      {/* Hero container that scrolls up and away normally */}
      <div
        id="hero-content"
        className="absolute top-0 left-0 w-full min-h-[100dvh] z-20 flex flex-col items-center justify-start text-center px-4 sm:px-8 pointer-events-none"
      >
        <div
          style={{ width: "100%", height: "100dvh" }}
          className="pointer-events-auto relative flex items-center justify-center"
        >
          <Lanyard
            frontImage="/card-front.webp"
            backImage="/card-back.webp"
            cardColor="#0075ff"
            cornerRadius={0.35}
            size={0.38}
            strapColor="#000000"
            strapWidth={0.85}
            gravity={0.55}
            damping={0.2}
            elasticity={0.15}
            breeze={0.45}
          />
        </div>

        {/* Scroll Indicator placed within hero container so it scrolls away naturally */}
        <ScrollIndicator />
      </div>
    </main>
  );
}

