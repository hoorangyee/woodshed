import { signOut } from "@/lib/auth/auth";
import type { CurrentUser } from "@/lib/auth/current-user";
import type { Dict } from "@/lib/i18n/dictionaries";

/** 로그인 사용자의 아바타 + 핸들 + 로그아웃. */
export function AccountMenu({ user, t }: { user: CurrentUser; t: Dict }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-rule bg-paper-raised p-1">
      {user.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.image} alt="" className="h-6 w-6 rounded-full" />
      ) : (
        <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-xs text-paper-raised">
          {(user.handle ?? user.name ?? "?").slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="px-1 text-sm text-ink-soft">@{user.handle}</span>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button className="rounded-full px-2 py-0.5 text-xs text-ink-faint hover:text-accent">
          {t.signOut}
        </button>
      </form>
    </div>
  );
}
