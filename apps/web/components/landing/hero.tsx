import { Button } from "@/components/ui/button";
import { GlowOrb } from "./glow-orb";
import { TechBadge } from "./tech-badge";
import { Github } from "lucide-react";

export function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <GlowOrb color="cyan" size="lg" className="left-1/4 top-1/4 -translate-x-1/2 -translate-y-1/2" />
      <GlowOrb color="purple" size="md" className="bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2" />
      <GlowOrb color="blue" size="sm" className="right-1/3 top-1/3" />

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <h1 className="animate-fade-in-up mb-6 text-5xl font-bold tracking-tight text-slate-100 opacity-0 sm:text-6xl lg:text-7xl">
          <span className="text-gradient">Composable AI Stack</span>
        </h1>
        <p className="animation-delay-100 animate-fade-in-up mx-auto mb-8 max-w-2xl text-lg text-slate-400 opacity-0 sm:text-xl">
          A production-ready monorepo for building AI-powered applications.
          Modern tooling, real-time backend, and structured AI workflows.
        </p>

        <div className="animation-delay-200 animate-fade-in-up mb-12 flex flex-col items-center justify-center gap-4 opacity-0 sm:flex-row">
          <Button
            size="lg"
            className="glow-border bg-gradient-to-r from-cyan-500 to-purple-600 px-8 text-white transition-all hover:from-cyan-400 hover:to-purple-500"
          >
            Get Started
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="border-slate-700 bg-transparent text-slate-300 hover:border-slate-600 hover:bg-slate-800/50"
          >
            <Github className="mr-2 h-5 w-5" />
            View on GitHub
          </Button>
        </div>

        <div className="animation-delay-300 animate-fade-in-up flex flex-wrap items-center justify-center gap-3 opacity-0">
          <TechBadge name="Bun" />
          <TechBadge name="Next.js 16" />
          <TechBadge name="Convex" />
          <TechBadge name="TypeScript" />
          <TechBadge name="React 19" />
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <div className="animate-bounce text-slate-500">
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>
      </div>
    </section>
  );
}
