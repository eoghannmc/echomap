import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";

export default function Home() {
  return (
    <main className="min-h-dvh bg-base dark:bg-panel text-foreground">
      <Header />

      <section className="flex flex-col items-center justify-center min-h-screen gap-8">
        <h1 className="text-4xl font-bold text-brand text-center">
          Your Digital twin  
        </h1>
        <p className="text-accent text-center">
          Geo-spatial insights made easy — search, analyze, and visualize.
        </p>

        <SearchBar />
      </section>
    </main>
  );
}
