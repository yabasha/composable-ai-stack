import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Composable AI Stack",
  description: "A production-ready monorepo for building AI-powered applications"
};

// Nonce is wired through `x-nonce` by middleware.ts. Forks that render
// `<Script>` tags should call `headers()` here and pass `nonce` to those tags,
// which will switch this layout to dynamic rendering at that point.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
