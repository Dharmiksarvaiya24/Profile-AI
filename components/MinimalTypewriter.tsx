"use client";

import React, { useState, useEffect, useRef } from "react";

interface MinimalTypewriterProps {
  firstText?: string;
  secondText?: string;
  firstColor?: string;
  secondColor?: string;
  cursorColor?: string;
}

export function MinimalTypewriter({
  firstText = "Hello World",
  secondText = "Coming Soon !",
  firstColor = "#E6E4DE",
  secondColor = "#175fab",
  cursorColor = "#E6E4DE",
}: MinimalTypewriterProps) {
  const [displayText, setDisplayText] = useState("");
  const [currentPhrase, setCurrentPhrase] = useState<"first" | "second">("first");
  const [phase, setPhase] = useState<
    | "initial-delay"
    | "typing-first"
    | "pause-first"
    | "deleting-first"
    | "pause-delete-first"
    | "typing-second"
    | "pause-second"
    | "deleting-second"
    | "pause-delete-second"
  >("initial-delay");

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Natural typewriter timing with organic micro-variations
    const getTypingDelay = () => 85 + Math.floor(Math.random() * 30 - 15);
    const deletingSpeed = 45;

    if (phase === "initial-delay") {
      timerRef.current = setTimeout(() => {
        setPhase("typing-first");
      }, 250);
    } else if (phase === "typing-first") {
      if (displayText.length < firstText.length) {
        timerRef.current = setTimeout(() => {
          setDisplayText(firstText.slice(0, displayText.length + 1));
        }, getTypingDelay());
      } else {
        setPhase("pause-first");
      }
    } else if (phase === "pause-first") {
      timerRef.current = setTimeout(() => {
        setPhase("deleting-first");
      }, 1200);
    } else if (phase === "deleting-first") {
      if (displayText.length > 0) {
        timerRef.current = setTimeout(() => {
          setDisplayText((prev) => prev.slice(0, -1));
        }, deletingSpeed);
      } else {
        setPhase("pause-delete-first");
      }
    } else if (phase === "pause-delete-first") {
      setCurrentPhrase("second");
      timerRef.current = setTimeout(() => {
        setPhase("typing-second");
      }, 280);
    } else if (phase === "typing-second") {
      if (displayText.length < secondText.length) {
        timerRef.current = setTimeout(() => {
          setDisplayText(secondText.slice(0, displayText.length + 1));
        }, getTypingDelay());
      } else {
        setPhase("pause-second");
      }
    } else if (phase === "pause-second") {
      timerRef.current = setTimeout(() => {
        setPhase("deleting-second");
      }, 1500);
    } else if (phase === "deleting-second") {
      if (displayText.length > 0) {
        timerRef.current = setTimeout(() => {
          setDisplayText((prev) => prev.slice(0, -1));
        }, deletingSpeed);
      } else {
        setPhase("pause-delete-second");
      }
    } else if (phase === "pause-delete-second") {
      setCurrentPhrase("first");
      timerRef.current = setTimeout(() => {
        setPhase("typing-first");
      }, 280);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [displayText, phase, firstText, secondText]);

  const textColor = currentPhrase === "first" ? firstColor : secondColor;

  return (
    <span className="inline-flex items-center justify-center select-none" style={{ color: textColor }}>
      <span className="whitespace-nowrap">{displayText || "\u200B"}</span>
      <span
        className="inline-block ml-1.5 align-middle select-none pointer-events-none"
        style={{
          width: "1px",
          height: "0.88em",
          backgroundColor: cursorColor,
          animation: "typewriterCursorBlink 0.9s ease-in-out infinite",
        }}
        aria-hidden="true"
      />
      <style jsx>{`
        @keyframes typewriterCursorBlink {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
        }
      `}</style>
    </span>
  );
}

export default MinimalTypewriter;
