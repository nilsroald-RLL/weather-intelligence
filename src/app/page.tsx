import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-md flex-col items-center gap-6 px-6 py-32">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Weather Intelligence</CardTitle>
            <CardDescription>
              Tilpasset værmelding for Leiligheten og Hytta er under
              utvikling.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button disabled className="w-full">
              Se værmelding (kommer)
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
