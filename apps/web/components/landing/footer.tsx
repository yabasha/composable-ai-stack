import { TechBadge } from "./tech-badge";
import { Github, BookOpen, Rocket } from "lucide-react";

const links = [
  { label: "GitHub", href: "#", icon: Github },
  { label: "Docs", href: "#", icon: BookOpen },
  { label: "Get Started", href: "#", icon: Rocket },
];

export function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center gap-8">
          <p className="text-lg text-slate-400">
            Built with <span className="text-gradient font-semibold">Composable AI Stack</span>
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-2 text-sm text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-800/50 hover:text-slate-100"
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            <TechBadge name="Bun" size="sm" />
            <TechBadge name="Turborepo" size="sm" />
            <TechBadge name="TypeScript" size="sm" />
          </div>

          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} Composable AI Stack by{" "}
            <a
              href="https://yabasha.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 transition-colors hover:text-cyan-400"
            >
              Yabasha (Bashar Ayyash)
            </a>
            . Open source under MIT license.
          </p>
        </div>
      </div>
    </footer>
  );
}
