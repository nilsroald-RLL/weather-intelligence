export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-md flex-col items-center gap-2 px-6 py-32 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Weather Intelligence
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Tilpasset værmelding for Leiligheten og Hytta er under utvikling.
        </p>
      </main>
    </div>
  );
}
