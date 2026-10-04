export interface ProjectItem {
  slug: string;
  displayName: string;
  title: string;
  description: string;
  liveUrl: string;
  githubUrl: string;
  thumbnail: string;
}

export const PROJECTS_DATA: ProjectItem[] = [
  {
    slug: "unidrive",
    displayName: "UniDrive",
    title: "UniDrive",
    description:
      "A unified multi-account Google Drive workspace featuring multi-tenant OAuth 2.0 token management, real-time file synchronization, and unified search across multiple Google accounts in one interface.",
    liveUrl: "https://unidrive-kappa.vercel.app/",
    githubUrl: "https://github.com/Dharmiksarvaiya24/UniDrive",
    thumbnail: "/dock/finder.png",
  },
  {
    slug: "3dm-render-agent",
    displayName: "3DM Render Agent",
    title: "3DM Render Agent",
    description:
      "An intelligent autonomous rendering pipeline and automation agent that streamlines 3D rendering workflows, distributes batch tasks, and optimizes compute resources across render nodes.",
    liveUrl: "", // No live link — only GitHub
    githubUrl: "https://github.com/Dharmiksarvaiya24/3DM-Render-Agent",
    thumbnail: "/dock/finder.png",
  },
  {
    slug: "copilot-review",
    displayName: "Copilot Review",
    title: "Copilot Review",
    description:
      "An AI-powered automated code review assistant that analyzes pull requests, flags subtle bugs and security edge cases, suggests optimizations, and enforces repository best practices.",
    liveUrl: "", // No live link — only GitHub
    githubUrl: "https://github.com/Dharmiksarvaiya24/Github-copilot-replica-workflow",
    thumbnail: "/dock/finder.png",
  },
  {
    slug: "invotrack",
    displayName: "InvoTrack",
    title: "InvoTrack",
    description:
      "An end-to-end invoice and inventory management software built for small and medium businesses to manage client billing, stock levels, orders, and real-time revenue analytics.",
    liveUrl: "",
    githubUrl: "https://github.com/Dharmiksarvaiya24/Invo_track",
    thumbnail: "/dock/finder.png",
  },
  {
    slug: "socket-voting",
    displayName: "Socket Voting",
    title: "Socket Voting",
    description:
      "High-concurrency real-time voting and live polling platform featuring room management, instant vote tallying, and zero-latency WebSocket synchronization across connected clients.",
    liveUrl: "",
    githubUrl: "https://github.com/Dharmiksarvaiya24/Socket-Voting",
    thumbnail: "/dock/finder.png",
  },
  {
    slug: "pointz",
    displayName: "Pointz",
    title: "Pointz",
    description:
      "A real-time points-earning and gamified reward tracking platform designed for friends, teams, and family members to log daily achievements, compete, and redeem perks.",
    liveUrl: "",
    githubUrl: "https://github.com/Dharmiksarvaiya24/Pointz",
    thumbnail: "/dock/finder.png",
  },
  {
    slug: "trident",
    displayName: "Trident Jewels",
    title: "Trident Jewels",
    description:
      "A jewelry design and showcase platform built for a live client featuring high-performance image lazy loading, responsive catalog browsing, and refined modern aesthetics.",
    liveUrl: "https://tridentdesigning.in",
    githubUrl: "https://github.com/Dharmiksarvaiya24/Trident-Jewels",
    thumbnail: "/dock/finder.png",
  },
  {
    slug: "apple-web-replica",
    displayName: "Apple Web Replica",
    title: "Apple Web Replica",
    description:
      "An interactive 3D web experience replicating Apple flagship design aesthetics with smooth hardware animations, scroll-driven transitions, and responsive typography.",
    liveUrl: "",
    githubUrl: "https://github.com/Dharmiksarvaiya24/apple-os-webpage-replica",
    thumbnail: "/dock/finder.png",
  },
  {
    slug: "growwdigit",
    displayName: "GrowwDigit",
    title: "GrowwDigit",
    description:
      "A digital marketing and web agency platform providing comprehensive social media management, brand strategy, and custom web application development for client businesses.",
    liveUrl: "",
    githubUrl: "https://github.com/Dharmiksarvaiya24/GrowwDigit",
    thumbnail: "/dock/finder.png",
  },
];

export function isPlaceholder(val?: string | string[]): boolean {
  if (!val) return true;
  if (Array.isArray(val)) {
    return val.length === 0 || val.every((item) => item.trim().toLowerCase().startsWith("todo"));
  }
  return val.trim().toLowerCase().startsWith("todo") || val.trim().length === 0;
}

export function getSafeText(val?: string, fallback = "Details coming soon"): string {
  if (!val || isPlaceholder(val)) return fallback;
  return val;
}
