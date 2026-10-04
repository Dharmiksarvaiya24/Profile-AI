"use client";

import React, { useState } from "react";
import {
  PROJECTS_DATA,
  isPlaceholder,
  getSafeText,
} from "../data/projectsData";

export interface ProjectsContentProps {
  currentFolder: string;
  onSelectFolder: (slug: string) => void;
  onBackToRoot: () => void;
  isMobile: boolean;
}

export default function ProjectsContent({
  currentFolder,
  onSelectFolder,
  onBackToRoot,
  isMobile,
}: ProjectsContentProps) {
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setNoticeMessage(msg);
    setTimeout(() => {
      setNoticeMessage(null);
    }, 2400);
  };

  // ── Root View: List of 9 Project Folders + GitHub Footer ─────────────────────
  if (currentFolder === "root") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100%",
          gap: "24px",
        }}
      >
        {/* Project Folders Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "repeat(auto-fill, minmax(76px, 1fr))"
              : "repeat(auto-fill, minmax(88px, 1fr))",
            gap: isMobile ? "12px 10px" : "18px 14px",
            alignItems: "start",
          }}
        >
          {PROJECTS_DATA.map((project) => (
            <div
              key={project.slug}
              onClick={() => onSelectFolder(project.slug)}
              title={project.displayName}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "5px",
                padding: "8px 6px",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {/* macOS Blue Folder Icon */}
              <div
                style={{
                  width: "52px",
                  height: "44px",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.35))",
                }}
              >
                <svg
                  width="52"
                  height="42"
                  viewBox="0 0 64 52"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Back tab */}
                  <path
                    d="M4 10C4 6.68629 6.68629 4 10 4H23.5858C25.1771 4 26.7033 4.63214 27.8284 5.75736L31.4142 9.34315C32.1643 10.0932 33.1818 10.5147 34.2426 10.5147H54C57.3137 10.5147 60 13.201 60 16.5147V42C60 45.3137 57.3137 48 54 48H10C6.68629 48 4 45.3137 4 42V10Z"
                    fill="#0071E3"
                  />
                  {/* Folder front flap */}
                  <path
                    d="M4 18C4 14.6863 6.68629 12 10 12H54C57.3137 12 60 14.6863 60 18V42C60 45.3137 57.3137 48 54 48H10C6.68629 48 4 45.3137 4 42V18Z"
                    fill="url(#folderGrad)"
                  />
                  <defs>
                    <linearGradient
                      id="folderGrad"
                      x1="32"
                      y1="12"
                      x2="32"
                      y2="48"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#389BFF" />
                      <stop offset="1" stopColor="#0071E3" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              {/* Folder Label */}
              <span
                style={{
                  fontSize: "11.5px",
                  fontWeight: 500,
                  color: "#FFFFFF",
                  textAlign: "center",
                  wordBreak: "break-word",
                  lineHeight: "1.25",
                  maxWidth: "84px",
                }}
              >
                {project.displayName}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom Banner: Visit GitHub for more */}
        <div
          style={{
            marginTop: "auto",
            paddingTop: "16px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <a
            href="https://github.com/Dharmiksarvaiya24/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "7px 14px",
              borderRadius: "7px",
              backgroundColor: "rgba(255, 255, 255, 0.07)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#FFFFFF",
              fontSize: "12px",
              fontWeight: 500,
              textDecoration: "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.13)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.22)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.07)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="currentColor"
              color="#FFFFFF"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            <span>Visit GitHub for more</span>
            <span style={{ opacity: 0.5, fontSize: "11px" }}>↗</span>
          </a>
        </div>
      </div>
    );
  }

  // ── Inside Folder View ───────────────────────────────────────────────────────
  const project = PROJECTS_DATA.find((p) => p.slug === currentFolder);

  if (!project) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          gap: "10px",
          color: "rgba(255, 255, 255, 0.5)",
        }}
      >
        <p style={{ fontSize: "13px" }}>Folder not found</p>
        <button
          onClick={onBackToRoot}
          style={{
            padding: "5px 12px",
            borderRadius: "6px",
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            color: "#FFF",
            fontSize: "12px",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            cursor: "pointer",
          }}
        >
          ‹ Back to Projects
        </button>
      </div>
    );
  }

  const hasLiveLink = !isPlaceholder(project.liveUrl);
  const hasGithubLink = !isPlaceholder(project.githubUrl);
  const safeDescription = getSafeText(
    project.description,
    "Details coming soon."
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        minHeight: "100%",
        padding: "4px 2px",
      }}
    >
      {/* Toast Notice for actions */}
      {noticeMessage && (
        <div
          style={{
            position: "absolute",
            top: "54px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "rgba(30, 30, 34, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "8px",
            padding: "6px 14px",
            fontSize: "11.5px",
            color: "#FFFFFF",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            zIndex: 30,
            pointerEvents: "none",
            animation: "fadeIn 0.15s ease",
          }}
        >
          {noticeMessage}
        </div>
      )}

      {/* ── PROJECT SHOWCASE CARD: Name + Live & GitHub Buttons + Lorem Text ── */}
      <div
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.09)",
          borderRadius: "10px",
          padding: isMobile ? "14px 14px" : "18px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {/* Row with Project Name & Buttons */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          {/* Project Name */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h2
              style={{
                margin: 0,
                fontSize: isMobile ? "16px" : "18px",
                fontWeight: 700,
                color: "#FFFFFF",
                letterSpacing: "-0.01em",
              }}
            >
              {project.displayName}
            </h2>
          </div>

          {/* Action Buttons: Live Btn (if available) & GitHub Btn */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* Live button — only rendered when project has a valid live URL */}
            {hasLiveLink && (
              <button
                onClick={() => {
                  window.open(project.liveUrl, "_blank", "noopener,noreferrer");
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "6px 14px",
                  borderRadius: "6px",
                  backgroundColor: "#0071E3",
                  border: "1px solid #0077ED",
                  color: "#FFFFFF",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <span>Live</span>
                <span style={{ fontSize: "11px", opacity: 0.8 }}>↗</span>
              </button>
            )}

            {/* GitHub button */}
            <button
              onClick={() => {
                if (hasGithubLink) {
                  window.open(project.githubUrl, "_blank", "noopener,noreferrer");
                } else {
                  showNotice("GitHub repository link coming soon");
                }
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "6px",
                backgroundColor: hasGithubLink ? "#24292E" : "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#FFFFFF",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              <span>GitHub</span>
              <span style={{ fontSize: "11px", opacity: 0.8 }}>↗</span>
            </button>
          </div>
        </div>

        {/* Project Description */}
        <p
          style={{
            margin: 0,
            fontSize: isMobile ? "12px" : "13px",
            lineHeight: "1.65",
            color: "rgba(255, 255, 255, 0.82)",
          }}
        >
          {safeDescription}
        </p>
      </div>
    </div>
  );
}
