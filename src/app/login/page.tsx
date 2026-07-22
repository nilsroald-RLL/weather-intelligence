import { redirect } from "next/navigation";
import { signIn } from "./actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type LoginSearchParams = {
  next?: string;
  error?: string;
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "Skriv inn e-post og passord.",
  "not-approved": "Denne e-postadressen er ikke godkjent for pålogging.",
  "invalid-credentials": "Feil e-post eller passord.",
  system: "Noe gikk galt. Sjekk Supabase-oppsettet i .env.local.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<LoginSearchParams>;
}) {
  const params = await searchParams;
  const next = params.next ?? "/admin";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(next);
  }

  const errorMessage = params.error ? ERROR_MESSAGES[params.error] : undefined;

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-md flex-col items-center gap-6 px-6 py-32">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Logg inn</CardTitle>
            <CardDescription>Skriv inn en godkjent e-postadresse og passord.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
            <form action={signIn} className="flex flex-col gap-3">
              <input type="hidden" name="next" value={next} />
              <Input
                type="email"
                name="email"
                required
                autoFocus
                placeholder="din@epost.no"
                aria-label="E-postadresse"
              />
              <Input
                type="password"
                name="password"
                required
                placeholder="Passord"
                aria-label="Passord"
              />
              <Button type="submit" className="w-full">
                Logg inn
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
