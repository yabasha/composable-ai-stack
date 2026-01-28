export function Architecture() {
  return (
    <section className="bg-gradient-to-b from-slate-950 to-slate-900 px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-slate-100 sm:text-4xl">
            How It All Connects
          </h2>
          <p className="mx-auto max-w-2xl text-slate-400">
            A modular architecture where each piece works independently but
            integrates seamlessly.
          </p>
        </div>

        <div className="relative">
          {/* Architecture diagram */}
          <div className="flex flex-col items-center gap-8 lg:flex-row lg:justify-center lg:gap-4">
            {/* Frontend */}
            <ArchBox
              title="Next.js Frontend"
              subtitle="React 19 + App Router"
              color="cyan"
            />

            {/* Connection line */}
            <ConnectionLine />

            {/* Convex (center) */}
            <div className="relative">
              <ArchBox
                title="Convex Backend"
                subtitle="Real-time Database"
                color="purple"
                primary
              />
            </div>

            {/* Connection lines to other services */}
            <ConnectionLine />

            {/* Right side services */}
            <div className="flex flex-col gap-4">
              <ArchBox
                title="ElysiaJS API"
                subtitle="Webhooks & OAuth"
                color="blue"
                small
              />
              <ArchBox
                title="Background Worker"
                subtitle="Jobs & Evals"
                color="blue"
                small
              />
            </div>
          </div>

          {/* Bottom packages */}
          <div className="mt-8 flex justify-center">
            <div className="flex flex-wrap justify-center gap-4">
              <PackageBox name="prompts" />
              <PackageBox name="ai" />
              <PackageBox name="schemas" />
              <PackageBox name="evals" />
            </div>
          </div>

          {/* Connection lines from Convex to packages */}
          <div className="absolute left-1/2 top-[45%] h-16 w-px -translate-x-1/2 bg-gradient-to-b from-purple-500/50 to-transparent" />
        </div>
      </div>
    </section>
  );
}

function ArchBox({
  title,
  subtitle,
  color,
  primary,
  small,
}: {
  title: string;
  subtitle: string;
  color: "cyan" | "purple" | "blue";
  primary?: boolean;
  small?: boolean;
}) {
  const colorClasses = {
    cyan: "border-cyan-500/50 shadow-cyan-500/20",
    purple: "border-purple-500/50 shadow-purple-500/20",
    blue: "border-blue-500/50 shadow-blue-500/20",
  };

  const glowClasses = {
    cyan: "from-cyan-500/10 to-transparent",
    purple: "from-purple-500/10 to-transparent",
    blue: "from-blue-500/10 to-transparent",
  };

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl border bg-slate-900/80 backdrop-blur-sm
        ${colorClasses[color]}
        ${primary ? "shadow-lg px-8 py-6" : small ? "px-4 py-3" : "px-6 py-4"}
      `}
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${glowClasses[color]}`}
      />
      <div className="relative z-10">
        <h3
          className={`font-semibold text-slate-100 ${primary ? "text-lg" : small ? "text-sm" : ""}`}
        >
          {title}
        </h3>
        <p className={`text-slate-400 ${small ? "text-xs" : "text-sm"}`}>
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function ConnectionLine() {
  return (
    <div className="relative hidden lg:block">
      <div className="h-px w-12 bg-gradient-to-r from-slate-700 via-slate-500 to-slate-700" />
      <div className="animate-line-pulse absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400" />
    </div>
  );
}

function PackageBox({ name }: { name: string }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 font-mono text-sm text-slate-300">
      packages/{name}
    </div>
  );
}
