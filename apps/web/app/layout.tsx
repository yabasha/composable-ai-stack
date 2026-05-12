import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Composable AI Stack",
  description: "A production-ready monorepo for building AI-powered applications"
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Nonce wired via middleware.ts; forks rendering <Script> tags pass this prop.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  void nonce;
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
