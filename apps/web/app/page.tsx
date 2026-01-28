import { Button } from "@/components/ui/button";

export default function Page() {
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">AI Swiss Army Template</h1>
      <p className="text-muted-foreground">
        Next.js + Tailwind + shadcn/ui, Convex-first backend, optional ElysiaJS gateway.
      </p>
      <Button>shadcn Button</Button>
    </main>
  );
}
