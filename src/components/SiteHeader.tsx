import { Wordmark } from "./ui";
import { LanguageSwitcher } from "./LanguageSwitcher";

/** 공통 상단바: 워드마크 + 언어 전환 + 우측 슬롯(계정/내비). */
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
