"use client";

import React, { useState, useEffect, useRef } from "react";

export interface MinimalTypewriterProps {
  texts?: string[];
  firstText?: string;
  secondText?: string;
  firstColor?: string;
  secondColor?: string;
  cursorColor?: string;
  matrixColor?: string;
  matrixGlow?: boolean;
  scrambleCount?: number;
  scrambleSpeed?: number;
  pauseFirst?: number;
  pauseSecond?: number;
  deletingSpeed?: number;
  cursorWidth?: string;
  characters?: string;
}

const DEFAULT_GREETINGS = [
  "Hello !",
  "Namaste !",
  "Ni hao !",
  "Bonjour !",
  "Hej !",
  "Privet !",
];

const DEFAULT_MATRIX_CHARS = "01010101XYZ0123456789ABCDEF$#@%&*<>{}[]/?~=+-!_\\|^";

interface DisplayChar {
  char: string;
  isScrambling: boolean;
}

function splitIntoGraphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(segmenter.segment(text), (s) => s.segment);
  }
  return Array.from(text);
}

function getGlowColor(color: string, alpha: number = 0.7): string {
  if (color.startsWith("#")) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex.split("").map((c) => c + c).join("");
    }
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

export function MinimalTypewriter({
  texts,
  firstText,
  secondText,
  firstColor = "#E6E4DE",
  secondColor = "#175fab",
  cursorColor = "#E6E4DE",
  matrixColor = "#175fab",
  matrixGlow = true,
  scrambleCount = 2,
  scrambleSpeed = 28,
  pauseFirst = 1300,
  pauseSecond = 1400,
  deletingSpeed = 28,
  cursorWidth = "2px",
  characters = DEFAULT_MATRIX_CHARS,
}: MinimalTypewriterProps) {
  const sequence = texts ?? (firstText ? [firstText, ...(secondText ? [secondText] : [])] : DEFAULT_GREETINGS);

  const [displayChars, setDisplayChars] = useState<DisplayChar[]>([]);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [phase, setPhase] = useState<
    | "initial-delay"
    | "typing"
    | "pause"
    | "deleting"
    | "pause-delete"
  >("initial-delay");

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const scrambleCounterRef = useRef<number>(0);

  const getRandomChar = () => {
    return characters[Math.floor(Math.random() * characters.length)];
  };

  useEffect(() => {
    // Balanced, organic typewriter timing variations
    const getTypingDelay = () => 30 + Math.floor(Math.random() * 16);

    if (phase === "initial-delay") {
      timerRef.current = setTimeout(() => {
        setPhase("typing");
      }, 200);
    } else if (phase === "typing") {
      const targetText = sequence[phraseIndex] ?? "";
      const targetGraphemes = splitIntoGraphemes(targetText);
      const currentLength = displayChars.length;

      if (currentLength === 0) {
        // Start typing first character
        if (targetGraphemes.length > 0) {
          const firstChar = targetGraphemes[0];
          if (firstChar === " ") {
            scrambleCounterRef.current = 0;
            timerRef.current = setTimeout(() => {
              setDisplayChars([{ char: " ", isScrambling: false }]);
            }, getTypingDelay());
          } else {
            scrambleCounterRef.current = 1;
            timerRef.current = setTimeout(() => {
              setDisplayChars([{ char: getRandomChar(), isScrambling: true }]);
            }, scrambleSpeed);
          }
        } else {
          setPhase("pause");
        }
      } else {
        const lastChar = displayChars[currentLength - 1];

        if (lastChar.isScrambling) {
          // Continue scrambling or resolve
          if (scrambleCounterRef.current < scrambleCount) {
            scrambleCounterRef.current += 1;
            timerRef.current = setTimeout(() => {
              setDisplayChars((prev) => {
                const next = [...prev];
                next[next.length - 1] = { char: getRandomChar(), isScrambling: true };
                return next;
              });
            }, scrambleSpeed);
          } else {
            // Lock in the real character
            const targetChar = targetGraphemes[currentLength - 1] ?? "";
            scrambleCounterRef.current = 0;
            timerRef.current = setTimeout(() => {
              setDisplayChars((prev) => {
                const next = [...prev];
                next[next.length - 1] = { char: targetChar, isScrambling: false };
                return next;
              });
            }, getTypingDelay());
          }
        } else {
          // Last char is locked, check if more characters need typing
          if (currentLength < targetGraphemes.length) {
            const nextTargetChar = targetGraphemes[currentLength];
            if (nextTargetChar === " ") {
              timerRef.current = setTimeout(() => {
                setDisplayChars((prev) => [...prev, { char: " ", isScrambling: false }]);
              }, getTypingDelay());
            } else {
              scrambleCounterRef.current = 1;
              timerRef.current = setTimeout(() => {
                setDisplayChars((prev) => [...prev, { char: getRandomChar(), isScrambling: true }]);
              }, scrambleSpeed);
            }
          } else {
            // All characters revealed and resolved
            setPhase("pause");
          }
        }
      }
    } else if (phase === "pause") {
      const pauseDuration = phraseIndex % 2 === 0 ? pauseFirst : pauseSecond;
      timerRef.current = setTimeout(() => {
        setPhase("deleting");
      }, pauseDuration);
    } else if (phase === "deleting") {
      if (displayChars.length > 0) {
        const lastIndex = displayChars.length - 1;
        const lastItem = displayChars[lastIndex];

        // Glitch to a matrix character briefly before removing
        if (!lastItem.isScrambling && lastItem.char !== " ") {
          timerRef.current = setTimeout(() => {
            setDisplayChars((prev) => {
              const next = [...prev];
              next[next.length - 1] = { char: getRandomChar(), isScrambling: true };
              return next;
            });
          }, Math.max(16, Math.floor(deletingSpeed * 0.65)));
        } else {
          timerRef.current = setTimeout(() => {
            setDisplayChars((prev) => prev.slice(0, -1));
          }, deletingSpeed);
        }
      } else {
        setPhase("pause-delete");
      }
    } else if (phase === "pause-delete") {
      timerRef.current = setTimeout(() => {
        setPhraseIndex((prev) => (prev + 1) % sequence.length);
        setPhase("typing");
      }, 200);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [
    displayChars,
    phase,
    phraseIndex,
    sequence,
    scrambleCount,
    scrambleSpeed,
    pauseFirst,
    pauseSecond,
    deletingSpeed,
    characters,
  ]);

  const textColor = phraseIndex % 2 === 0 ? firstColor : secondColor;
  const glowColor = getGlowColor(matrixColor, 0.75);
  const currentPhraseText = sequence[phraseIndex] ?? "";
  const isCurrentlyScrambling = displayChars.some((c) => c.isScrambling);

  return (
    <span
      className="inline-flex items-center justify-center select-none"
      role="text"
      aria-label={currentPhraseText}
    >
      <span className="whitespace-nowrap" aria-hidden="true">
        {displayChars.length === 0 ? (
          <span className="opacity-0">{"\u200B"}</span>
        ) : (
          displayChars.map((item, index) => (
            <span
              key={index}
              style={{
                color: item.isScrambling ? matrixColor : textColor,
                textShadow:
                  item.isScrambling && matrixGlow
                    ? `0 0 8px ${glowColor}, 0 0 16px ${glowColor}`
                    : undefined,
                transition: item.isScrambling ? "none" : "color 0.15s ease",
              }}
            >
              {item.char}
            </span>
          ))
        )}
      </span>
      <span
        className="inline-block ml-1.5 sm:ml-2 align-middle select-none pointer-events-none"
        style={{
          width: cursorWidth,
          height: "0.85em",
          backgroundColor: isCurrentlyScrambling ? matrixColor : cursorColor,
          boxShadow:
            matrixGlow && isCurrentlyScrambling
              ? `0 0 8px ${glowColor}`
              : undefined,
          animation: "typewriterCursorBlink 0.9s ease-in-out infinite",
          transition: "background-color 0.15s ease",
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
