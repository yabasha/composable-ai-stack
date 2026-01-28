/**
 * check-versions.ts
 *
 * Purpose:
 * - Enforce "template pins" so this repo stays deterministic.
 * - Fails CI if critical dependency versions drift.
 *
 * Run:
 *   bun tooling/scripts/check-versions.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

type Pkg = {
  name?: string;
  version?: string;
  private?: boolean;
  packageManager?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

function readJSON(path: string): Pkg {
  return JSON.parse(readFileSync(path, "utf8"));
}

function getDep(pkg: Pkg, name: string): string | undefined {
  return pkg.dependencies?.[name] ?? pkg.devDependencies?.[name];
}

function assertEq(label: string, actual: string | undefined, expected: string) {
  if (actual !== expected) {
    throw new Error(`${label} expected "${expected}" but found "${actual ?? "undefined"}"`);
  }
}

function assertDefined(label: string, actual: string | undefined) {
  if (!actual) throw new Error(`${label} is missing`);
}

// --- pinned versions (update here on purpose) ---
const PINS = {
  root: {
    packageManager: "bun@1.3.7",
    devDependencies: {
      turbo: "2.7.6",
      typescript: "5.9.3",
      prettier: "3.8.1"
    }
  },
  web: {
    dependencies: {
      next: "16.1.6",
      react: "19.2.4",
      "react-dom": "19.2.4"
    },
    devDependencies: {
      tailwindcss: "4.1.18",
      "@tailwindcss/postcss": "4.1.18",
      eslint: "9.39.2",
      "eslint-config-next": "16.1.6",
      typescript: "5.9.3"
    }
  },
  api: {
    dependencies: {
      elysia: "1.4.22"
    }
  },
  convex: {
    dependencies: {
      convex: "1.31.6"
    },
    devDependencies: {
      typescript: "5.9.3"
    }
  }
} as const;

const ROOT = join(process.cwd());

const rootPkg = readJSON(join(ROOT, "package.json"));
assertDefined("root packageManager", rootPkg.packageManager);
assertEq("root packageManager", rootPkg.packageManager, PINS.root.packageManager);

for (const [dep, ver] of Object.entries(PINS.root.devDependencies)) {
  assertEq(`root devDependency ${dep}`, rootPkg.devDependencies?.[dep], ver);
}

const webPkg = readJSON(join(ROOT, "apps", "web", "package.json"));
for (const [dep, ver] of Object.entries(PINS.web.dependencies)) {
  assertEq(`apps/web dependency ${dep}`, webPkg.dependencies?.[dep], ver);
}
for (const [dep, ver] of Object.entries(PINS.web.devDependencies)) {
  assertEq(`apps/web devDependency ${dep}`, getDep(webPkg, dep), ver);
}

const apiPkg = readJSON(join(ROOT, "apps", "api", "package.json"));
for (const [dep, ver] of Object.entries(PINS.api.dependencies)) {
  assertEq(`apps/api dependency ${dep}`, apiPkg.dependencies?.[dep], ver);
}

const convexPkg = readJSON(join(ROOT, "apps", "convex", "package.json"));
for (const [dep, ver] of Object.entries(PINS.convex.dependencies)) {
  assertEq(`apps/convex dependency ${dep}`, convexPkg.dependencies?.[dep], ver);
}
for (const [dep, ver] of Object.entries(PINS.convex.devDependencies)) {
  assertEq(`apps/convex devDependency ${dep}`, getDep(convexPkg, dep), ver);
}

console.log("✅ Version pins OK");
