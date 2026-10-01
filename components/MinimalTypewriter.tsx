"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";

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

const graphemeSegmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

function splitIntoGraphemes(text: string): string[] {
  if (graphemeSegmenter) {
    return Array.from(graphemeSegmenter.segment(text), (s) => s.segment);
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
  scrambleCount = 3,
  scrambleSpeed = 40,
  pauseFirst = 1600,
  pauseSecond = 1800,
  deletingSpeed = 40,
  cursorWidth = "2px",
  characters = DEFAULT_MATRIX_CHARS,
}: MinimalTypewriterProps) {
  const sequence = useMemo(
    () => texts ?? (firstText ? [firstText, ...(secondText ? [secondText] : [])] : DEFAULT_GREETINGS),
    [texts, firstText, secondText]
  );

  const containerRef = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(true);
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

  // Pause typing timers when scrolled away from viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setTimeout(() => setActive(entry.isIntersecting), 0);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const getRandomChar = useCallback(() => {
    return characters[Math.floor(Math.random() * characters.length)];
  }, [characters]);

  useEffect(() => {
    if (!active) return;

    // Deliberate typewriter timing variations with clear decrypt visibility
    const getTypingDelay = () => 50 + Math.floor(Math.random() * 25);

    if (phase === "initial-delay") {
      timerRef.current = setTimeout(() => {
        setPhase("typing");
      }, 280);
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
          timerRef.current = setTimeout(() => {
            setPhase("pause");
          }, 0);
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
            timerRef.current = setTimeout(() => {
              setPhase("pause");
            }, 0);
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
          }, Math.max(24, Math.floor(deletingSpeed * 0.7)));
        } else {
          timerRef.current = setTimeout(() => {
            setDisplayChars((prev) => prev.slice(0, -1));
          }, deletingSpeed);
        }
      } else {
        timerRef.current = setTimeout(() => {
          setPhase("pause-delete");
        }, 0);
      }
    } else if (phase === "pause-delete") {
      timerRef.current = setTimeout(() => {
        setPhraseIndex((prev) => (prev + 1) % sequence.length);
        setPhase("typing");
      }, 280);
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
    getRandomChar,
    characters,
    active,
  ]);

  const textColor = phraseIndex % 2 === 0 ? firstColor : secondColor;
  const glowColor = getGlowColor(matrixColor, 0.75);
  const currentPhraseText = sequence[phraseIndex] ?? "";
  const isCurrentlyScrambling = displayChars.some((c) => c.isScrambling);

  return (
    <span
      ref={containerRef}
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
