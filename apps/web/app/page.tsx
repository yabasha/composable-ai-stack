import { Hero, FeaturesGrid, Architecture, Footer } from "@/components/landing";

export default function Page() {
  return (
    <main className="min-h-screen">
      <Hero />
      <FeaturesGrid />
      <Architecture />
      <Footer />
    </main>
  );
}
