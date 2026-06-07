import { signIn } from "@/lib/auth/auth";
import { btnPrimary, btnGhost, inputBase, WoodshedMark } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function LoginPage() {
  const t = getDictionary(await getLocale());
  const devLogin = process.env.AUTH_DEV_LOGIN === "1" && process.env.NODE_ENV !== "production";

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="w-full max-w-xs">
        <div className="mb-6 text-center">
          <h1 className="inline-flex items-center gap-2 font-serif text-3xl tracking-tight text-ink">
            <WoodshedMark className="text-accent" /> Woodshed
          </h1>
          <p className="mt-1 text-sm text-ink-soft">{t.appTagline}</p>
        </div>

        <div className="space-y-2">
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/" });
            }}
          >
            <SubmitButton className={`${btnPrimary} w-full`}>{t.signInGoogle}</SubmitButton>
          </form>
        </div>

        {devLogin && (
          <form
            action={async (formData: FormData) => {
              "use server";
              await signIn("dev", { name: String(formData.get("name") ?? ""), redirectTo: "/" });
            }}
            className="mt-4 space-y-2 rounded-lg border border-dashed border-rule p-3"
          >
            <p className="text-xs text-ink-faint">Dev-only login (creates a fake account by name)</p>
            <input name="name" placeholder="Dev User" className={inputBase} />
            <SubmitButton className={`${btnGhost} w-full justify-center`}>Dev Login</SubmitButton>
          </form>
        )}

        <div className="mt-6 flex justify-center">
          <LanguageSwitcher />
        </div>
      </div>
    </main>
  );
}
