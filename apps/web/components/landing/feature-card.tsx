import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  size?: "medium" | "large";
  className?: string;
}

export function FeatureCard({
  title,
  description,
  icon: Icon,
  size = "medium",
  className,
}: FeatureCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm transition-all duration-300",
        "hover:-translate-y-1 hover:border-slate-700 glow-border-hover",
        size === "large" && "col-span-2 p-8",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative z-10">
        <div className="mb-4 inline-flex rounded-xl bg-slate-800 p-3 text-cyan-400 transition-colors group-hover:bg-slate-700">
          <Icon className={cn("transition-transform group-hover:scale-110", size === "large" ? "h-7 w-7" : "h-6 w-6")} />
        </div>
        <h3 className={cn("mb-2 font-semibold text-slate-100", size === "large" ? "text-xl" : "text-lg")}>
          {title}
        </h3>
        <p className={cn("text-slate-400", size === "large" ? "text-base" : "text-sm")}>
          {description}
        </p>
      </div>
    </div>
  );
}
