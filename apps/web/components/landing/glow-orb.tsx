import { cn } from "@/lib/utils";

interface GlowOrbProps {
  className?: string;
  color?: "cyan" | "purple" | "blue";
  size?: "sm" | "md" | "lg";
}

const colorClasses = {
  cyan: "bg-cyan-500/30",
  purple: "bg-purple-500/30",
  blue: "bg-blue-500/30",
};

const sizeClasses = {
  sm: "h-32 w-32",
  md: "h-64 w-64",
  lg: "h-96 w-96",
};

export function GlowOrb({ className, color = "cyan", size = "md" }: GlowOrbProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute rounded-full blur-3xl",
        "animate-float animate-pulse-glow",
        colorClasses[color],
        sizeClasses[size],
        className
      )}
      aria-hidden="true"
    />
  );
}
