import { FeatureCard } from "./feature-card";
import {
  Database,
  Layout,
  Brain,
  Server,
  Cog,
  Package,
} from "lucide-react";

const features = [
  {
    title: "Convex Backend",
    description:
      "Real-time serverless backend with automatic data synchronization. Define your schema once, get type-safe queries and mutations everywhere.",
    icon: Database,
    size: "large" as const,
  },
  {
    title: "Next.js 16 Frontend",
    description:
      "React 19 with App Router, Server Components, and shadcn/ui. Modern patterns for building fast, accessible interfaces.",
    icon: Layout,
    size: "large" as const,
  },
  {
    title: "AI Packages",
    description:
      "Versioned prompts, typed tool definitions, and evaluation harness for testing prompt regressions.",
    icon: Brain,
    size: "medium" as const,
  },
  {
    title: "ElysiaJS Gateway",
    description:
      "Optional API layer for webhooks, OAuth flows, and streaming responses when you need more control.",
    icon: Server,
    size: "medium" as const,
  },
  {
    title: "Background Worker",
    description:
      "Long-running tasks and evaluation runner for processing jobs outside the request cycle.",
    icon: Cog,
    size: "medium" as const,
  },
  {
    title: "Shared Packages",
    description:
      "Centralized schemas, configuration, and utilities shared across all apps in the monorepo.",
    icon: Package,
    size: "medium" as const,
  },
];

export function FeaturesGrid() {
  return (
    <section className="bg-slate-950 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-slate-100 sm:text-4xl">
            Everything You Need
          </h2>
          <p className="mx-auto max-w-2xl text-slate-400">
            A complete toolkit for building AI-powered applications, from backend
            to frontend to AI workflows.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <FeatureCard
              key={feature.title}
              title={feature.title}
              description={feature.description}
              icon={feature.icon}
              size={feature.size}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
