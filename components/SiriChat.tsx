"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

export interface SiriChatProps {
  isMobile: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function SiriChat({ isMobile }: SiriChatProps) {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((smooth = false) => {
    if (chatScrollRef.current) {
      if (smooth) {
        chatScrollRef.current.scrollTo({
          top: chatScrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      } else {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      }
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(false);
    }
  }, [messages, isLoading, scrollToBottom]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputValue.trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = { role: "user", content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue("");
    setIsLoading(true);

    // Optimistically add empty assistant message for streaming
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const payload = JSON.stringify({
        messages: updatedMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      let res = await fetch("/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });

      if (res.status === 404) {
        res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
        });
      }

      if (!res.ok) {
        let friendlyError = "Something went wrong. Please try again.";
        if (res.status === 403) friendlyError = "Access forbidden. Request origin not allowed.";
        else if (res.status === 429) friendlyError = "Too many requests. Please wait a moment and try again.";
        else if (res.status === 500) friendlyError = "Something went wrong on the server. Please try again.";
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: friendlyError };
          return next;
        });
        return;
      }

      const contentType = res.headers.get("content-type") ?? "";

      if (contentType.includes("text/plain") && res.body) {
        // Streaming path: read chunks and progressively update the last message
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          const current = accumulated;
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { role: "assistant", content: current };
            return next;
          });
        }
      } else {
        // Fallback: legacy JSON path
        const data = await res.json();
        const replyText = typeof data?.reply === "string" ? data.reply : "No response received.";
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: replyText };
          return next;
        });
      }
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "assistant",
          content: "Unable to connect to Pixel. Please check your internet connection.",
        };
        return next;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        flex: 1,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: messages.length === 0 ? "center" : "flex-end",
        padding: isMobile ? "8px 10px" : "12px 18px",
        background: "#000000",
        overflow: "hidden",
        minHeight: 0,
        width: "100%",
        height: "100%",
      }}
    >
      {/* Ambient luminous glow */}
      <div
        style={{
          position: "absolute",
          width: isMobile ? "200px" : "360px",
          height: isMobile ? "100px" : "180px",
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse at center, rgba(168, 85, 247, 0.35) 0%, rgba(59, 130, 246, 0.25) 45%, transparent 70%)",
          filter: isMobile ? "blur(20px)" : "blur(40px)",
          pointerEvents: "none",
        }}
      />

      {/* When no messages: show Center Title Group (Logo, Heading, Subheading) */}
      {messages.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: isMobile ? "4px" : "6px",
            marginBottom: isMobile ? "10px" : "28px",
            transform: isMobile ? "translateY(-2px)" : "translateY(-22px)",
            position: "relative",
            zIndex: 2,
          }}
        >
          {/* Siri Icon */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/siri.png"
            alt="Siri"
            style={{
              width: isMobile ? "32px" : "54px",
              height: isMobile ? "32px" : "54px",
              borderRadius: "50%",
              objectFit: "contain",
              marginBottom: isMobile ? "2px" : "4px",
              filter:
                "drop-shadow(0 4px 16px rgba(168, 85, 247, 0.55)) drop-shadow(0 2px 8px rgba(59, 130, 246, 0.35))",
              userSelect: "none",
              pointerEvents: "none",
            }}
            draggable={false}
          />
          {/* Glowing Apple Intelligence gradient text in arcade font */}
          <h1
            style={{
              fontFamily:
                '"Press Start 2P", "Pixelify Sans", cursive, monospace',
              fontSize: isMobile ? "11px" : "17px",
              fontWeight: 700,
              letterSpacing: "0.02em",
              lineHeight: isMobile ? 1.3 : 1.45,
              background:
                "linear-gradient(135deg, #FF4593 0%, #D946EF 25%, #8B5CF6 50%, #3B82F6 75%, #06B6D4 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              margin: 0,
              padding: isMobile ? "0 4px" : "0 8px",
              filter: "drop-shadow(0 2px 18px rgba(217, 70, 239, 0.55))",
              maxWidth: "100%",
              wordBreak: "break-word",
            }}
          >
            Introducing Pixel.AI
          </h1>

          <p
            style={{
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif',
              fontSize: isMobile ? "9.5px" : "13px",
              lineHeight: isMobile ? "13px" : "normal",
              fontWeight: 400,
              color: "rgba(255, 255, 255, 0.65)",
              margin: 0,
              letterSpacing: "-0.01em",
              maxWidth: isMobile ? "270px" : "none",
            }}
          >
            My personal digital clone. Ask it absolutely anything about me.
          </p>
        </div>
      ) : (
        /* When chat has started: Top Corner Mini Header + Scrollable Conversation */
        <>
          {/* Top-left corner mini branding when chat has started */}
          <div
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              padding: isMobile ? "2px 4px 4px" : "4px 6px 6px",
              marginBottom: isMobile ? "2px" : "4px",
              position: "relative",
              zIndex: 3,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily:
                  '"Press Start 2P", "Pixelify Sans", cursive, monospace',
                fontSize: isMobile ? "9.5px" : "11px",
                fontWeight: 700,
                letterSpacing: "0.02em",
                background:
                  "linear-gradient(135deg, #FF4593 0%, #D946EF 25%, #8B5CF6 50%, #3B82F6 75%, #06B6D4 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Pixel
            </span>
          </div>

          {/* Scrollable Conversation Thread */}
          <div
            ref={chatScrollRef}
            className="chat-scroll"
            onWheel={(e) => e.stopPropagation()}
            style={{
              flex: 1,
              width: "100%",
              overflowY: "auto",
              padding: isMobile ? "4px 4px 10px" : "8px 6px 14px",
              display: "flex",
              flexDirection: "column",
              gap: isMobile ? "8px" : "10px",
              position: "relative",
              zIndex: 2,
              minHeight: 0,
            }}
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent:
                    msg.role === "user" ? "flex-end" : "flex-start",
                  alignItems: "flex-end",
                  gap: "6px",
                  width: "100%",
                }}
              >
                {msg.role === "assistant" && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src="/siri.png"
                    alt="Pixel"
                    style={{
                      width: isMobile ? "18px" : "20px",
                      height: isMobile ? "18px" : "20px",
                      borderRadius: "50%",
                      objectFit: "contain",
                      marginBottom: "2px",
                      flexShrink: 0,
                      filter:
                        "drop-shadow(0 1px 4px rgba(168, 85, 247, 0.45))",
                    }}
                    draggable={false}
                  />
                )}
                <div
                  style={{
                    maxWidth: isMobile ? "88%" : "84%",
                    padding: isMobile ? "7px 11px" : "9px 13px",
                    borderRadius:
                      msg.role === "user"
                        ? "16px 16px 4px 16px"
                        : "16px 16px 16px 4px",
                    backgroundColor:
                      msg.role === "user"
                        ? "#0071E3"
                        : "rgba(255, 255, 255, 0.08)",
                    border:
                      msg.role === "user"
                        ? "none"
                        : "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#FFFFFF",
                    fontSize: isMobile ? "11.5px" : "13px",
                    lineHeight: 1.45,
                    fontFamily:
                      '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif',
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    boxShadow:
                      msg.role === "user"
                        ? "0 2px 8px rgba(0, 113, 227, 0.35)"
                        : "0 2px 8px rgba(0, 0, 0, 0.3)",
                  }}
                >
                  {msg.content || (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "2.5px",
                        height: "14px",
                      }}
                    >
                      <span className="lyrics-bar lyrics-bar-1" />
                      <span className="lyrics-bar lyrics-bar-2" />
                      <span className="lyrics-bar lyrics-bar-3" />
                      <span className="lyrics-bar lyrics-bar-4" />
                    </div>
                  )}
                </div>
                {msg.role === "user" && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src="/user-avatar.png"
                    alt="You"
                    style={{
                      width: isMobile ? "24px" : "28px",
                      height: isMobile ? "24px" : "28px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      marginBottom: "2px",
                      flexShrink: 0,
                      border: "1px solid rgba(255, 255, 255, 0.3)",
                      boxShadow: "0 2px 8px rgba(0, 113, 227, 0.45)",
                    }}
                    draggable={false}
                  />
                )}
              </div>
            ))}
            <div ref={messagesEndRef} style={{ height: "12px", minHeight: "12px", flexShrink: 0 }} />
          </div>
        </>
      )}

      {/* Chat Box Wrapper */}
      <div
        style={{
          position: "relative",
          width: isMobile ? "96%" : "min(520px, 90%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2,
          flexShrink: 0,
        }}
      >
        {/* Animated Gradient Color Glow around text box (Visible only before first message) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: messages.length === 0 ? 0.9 : 0,
            pointerEvents: "none",
            transition: "opacity 0.35s ease",
            zIndex: 1,
          }}
        >
          {/* Wide soft multicolor ambient glow */}
          <div
            style={{
              position: "absolute",
              inset: isMobile ? "-3.5px" : "-7px",
              borderRadius: isMobile ? "23px" : "31px",
              background:
                "linear-gradient(120deg, #FF2E74 0%, #B829F7 25%, #2575FC 50%, #00E5FF 75%, #FF7A00 100%)",
              backgroundSize: "300% 300%",
              filter: isMobile ? "blur(7px)" : "blur(11px)",
              opacity: 0.55,
              animation: "siriGlowFlow 7s ease infinite",
              pointerEvents: "none",
            }}
          />

          {/* Soft tight rim glow */}
          <div
            style={{
              position: "absolute",
              inset: isMobile ? "-2px" : "-3px",
              borderRadius: isMobile ? "22px" : "28px",
              background:
                "linear-gradient(120deg, #FF2E74 0%, #B829F7 25%, #2575FC 50%, #00E5FF 75%, #FF7A00 100%)",
              backgroundSize: "300% 300%",
              filter: isMobile ? "blur(2.5px)" : "blur(4.5px)",
              opacity: 0.68,
              animation: "siriGlowFlow 7s ease infinite",
              pointerEvents: "none",
            }}
          />

          {/* Crisp border gradient */}
          <div
            style={{
              position: "absolute",
              inset: "-1px",
              borderRadius: isMobile ? "21px" : "26px",
              background:
                "linear-gradient(120deg, #FF2E74 0%, #B829F7 25%, #2575FC 50%, #00E5FF 75%, #FF7A00 100%)",
              backgroundSize: "200% 200%",
              opacity: 0.9,
              animation: "siriGlowFlow 7s ease infinite",
              pointerEvents: "none",
            }}
          />
        </div>

        {/* Chat Box Interior */}
        <form
          onSubmit={handleSend}
          style={{
            position: "relative",
            width: "100%",
            height: isMobile ? "38px" : "50px",
            backgroundColor: "#111116",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderRadius: isMobile ? "20px" : "25px",
            border:
              messages.length === 0
                ? "1px solid rgba(255, 255, 255, 0.18)"
                : "1px solid rgba(255, 255, 255, 0.14)",
            display: "flex",
            alignItems: "center",
            padding: isMobile ? "0 5px 0 12px" : "0 8px 0 18px",
            gap: isMobile ? "6px" : "8px",
            zIndex: 2,
            boxShadow:
              messages.length === 0
                ? "inset 0 1px 0 rgba(255, 255, 255, 0.15), 0 8px 24px rgba(0, 0, 0, 0.55)"
                : "inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 8px 24px rgba(0, 0, 0, 0.55)",
          }}
        >
          {/* Center: Input with placeholder */}
          <input
            type="text"
            value={inputValue}
            maxLength={400}
            disabled={isLoading}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={
              isLoading
                ? "Pixel is thinking..."
                : isMobile
                ? "Ask about me..."
                : "Type a question about me here..."
            }
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif',
              fontSize: isMobile ? "11.5px" : "14.5px",
              color: "#FFFFFF",
              padding: "0 4px",
              minWidth: 0,
              opacity: isLoading ? 0.6 : 1,
            }}
          />

          {/* Right: Send Button (Up Arrow) */}
          <button
            type="submit"
            aria-label="Send"
            disabled={isLoading || !inputValue.trim()}
            style={{
              width: isMobile ? "28px" : "32px",
              height: isMobile ? "28px" : "32px",
              padding: 0,
              borderRadius: "50%",
              backgroundColor:
                isLoading || !inputValue.trim()
                  ? "rgba(255, 255, 255, 0.12)"
                  : "#0071E3",
              border: "none",
              color:
                isLoading || !inputValue.trim()
                  ? "rgba(255, 255, 255, 0.4)"
                  : "#FFFFFF",
              cursor:
                isLoading || !inputValue.trim() ? "not-allowed" : "pointer",
              outline: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow:
                isLoading || !inputValue.trim()
                  ? "none"
                  : "0 2px 8px rgba(0, 113, 227, 0.4)",
              transition:
                "background-color 0.18s ease, transform 0.15s ease, box-shadow 0.18s ease, opacity 0.18s ease",
              opacity: isLoading ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isLoading && inputValue.trim()) {
                e.currentTarget.style.backgroundColor = "#0077ED";
                e.currentTarget.style.transform = "scale(1.05)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading && inputValue.trim()) {
                e.currentTarget.style.backgroundColor = "#0071E3";
                e.currentTarget.style.transform = "scale(1)";
              }
            }}
          >
            <svg
              width={isMobile ? 13 : 16}
              height={isMobile ? 13 : 16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </button>
        </form>
      </div>

      {/* Lightweight CSS animations & Single-line Scrollbar */}
      <style jsx>{`
        /* Single-line sleek scrollbar */
        .chat-scroll::-webkit-scrollbar {
          width: 3px;
        }
        .chat-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .chat-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.22);
          border-radius: 4px;
        }
        .chat-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.45);
        }
        .chat-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.22) transparent;
        }

        @keyframes siriGlowFlow {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        @keyframes musicBar {
          0%,
          100% {
            height: 4px;
            opacity: 0.45;
          }
          50% {
            height: 14px;
            opacity: 1;
          }
        }
        .lyrics-bar {
          width: 2.5px;
          border-radius: 2px;
          background: linear-gradient(
            180deg,
            #ff4593 0%,
            #d946ef 35%,
            #8b5cf6 65%,
            #00e5ff 100%
          );
          display: inline-block;
          animation: musicBar 1.1s ease-in-out infinite;
        }
        .lyrics-bar-1 {
          animation-delay: 0s;
        }
        .lyrics-bar-2 {
          animation-delay: 0.28s;
        }
        .lyrics-bar-3 {
          animation-delay: 0.55s;
        }
        .lyrics-bar-4 {
          animation-delay: 0.18s;
        }
      `}</style>
    </div>
  );
}
