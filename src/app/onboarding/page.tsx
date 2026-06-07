import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/current-user";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { HandleForm } from "./HandleForm";

export default async function OnboardingPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.handle) redirect("/");
  const t = getDictionary(await getLocale());

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="w-full max-w-xs">
        <div className="mb-6 text-center">
          <h1 className="font-serif text-2xl tracking-tight text-ink">{t.chooseHandle}</h1>
          <p className="mt-1 text-sm text-ink-soft">{t.handleIntro}</p>
        </div>
        <HandleForm />
      </div>
    </main>
  );
}
