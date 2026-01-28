import { cn } from "@/lib/utils";

interface TechBadgeProps {
  name: string;
  className?: string;
  size?: "sm" | "md";
}

export function TechBadge({ name, className, size = "md" }: TechBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-slate-700 bg-slate-800/50 font-mono text-slate-300 backdrop-blur-sm transition-colors hover:border-slate-600 hover:bg-slate-700/50",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        className
      )}
    >
      {name}
    </span>
  );
}
