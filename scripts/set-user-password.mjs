// Sets (or resets) the password for one approved Supabase auth user. Run
// interactively so the password is never echoed, logged, or stored in shell
// history or .env.local:
//
//   npm run auth:set-password -- nils.roald@gmail.com
//
// You'll be prompted for the new password twice. The account must already be
// provisioned first (npm run auth:sync-users).

import { createInterface } from "node:readline";
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2]?.trim().toLowerCase();

if (!email) {
  console.error("Usage: npm run auth:set-password -- <email>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Populate " +
      ".env.local, then run: npm run auth:set-password -- <email>",
  );
  process.exit(1);
}

function promptHidden(promptText) {
  if (!process.stdin.isTTY) {
    console.error(
      "This needs an interactive terminal to hide what you type - run it " +
        "directly in your terminal, not piped or scripted.",
    );
    process.exit(1);
  }

  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    process.stdout.write(promptText);
    // Suppresses local echo while typing, restored right after. Relies on a
    // readline internal (no public hidden-input API), which is fine for a
    // script only ever run by hand.
    const write = rl._writeToOutput.bind(rl);
    rl._writeToOutput = () => {};
    rl.question("", (answer) => {
      rl._writeToOutput = write;
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

const password = await promptHidden("New password (min 8 characters): ");
const confirmation = await promptHidden("Type it again to confirm: ");

if (password !== confirmation) {
  console.error("Passwords didn't match. Nothing was changed.");
  process.exit(1);
}

if (password.length < 8) {
  console.error("Password must be at least 8 characters. Nothing was changed.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 200,
});

if (listError) {
  console.error("Failed to look up Supabase auth users:", listError.message);
  process.exit(1);
}

const user = existingUsers.users.find((candidate) => candidate.email?.toLowerCase() === email);

if (!user) {
  console.error(
    `${email} has no Supabase auth user yet. Run \`npm run auth:sync-users\` first, then retry.`,
  );
  process.exit(1);
}

const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, { password });

if (updateError) {
  console.error(`Failed to set the password for ${email}:`, updateError.message);
  process.exit(1);
}

console.log(`${email}: password set.`);
