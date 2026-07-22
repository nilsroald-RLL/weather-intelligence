import { redirect } from "next/navigation";
import { signOut } from "./actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already guards /admin; this repeats the check so the page is
  // still safe if that matcher is ever narrowed by mistake.
  if (!user) {
    redirect("/login?next=/admin");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-md flex-col items-center gap-6 px-6 py-32">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Admin</CardTitle>
            <CardDescription>Logget inn som {user.email}.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={signOut}>
              <Button type="submit" variant="outline" className="w-full">
                Logg ut
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
