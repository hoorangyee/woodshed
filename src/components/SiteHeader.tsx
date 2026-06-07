import { Wordmark } from "./ui";
import { LanguageSwitcher } from "./LanguageSwitcher";

/** Shared top bar: wordmark + language switch + right slot (account/nav). */
export function SiteHeader({
  wordmarkClassName = "text-2xl",
  children,
}: {
  wordmarkClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <Wordmark className={wordmarkClassName} />
      <div className="flex flex-wrap items-center gap-2">
        <LanguageSwitcher />
        {children}
      </div>
    </div>
  );
}
