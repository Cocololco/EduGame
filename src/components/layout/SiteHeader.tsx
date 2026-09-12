"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/solo", label: "Solo" },
  { href: "/multiplayer", label: "Multiplayer" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/rules", label: "Rules" },
];

/** Small wave glyph used as the app's mark — echoes the surf theme without needing an image asset. */
function WaveMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="15" className="fill-teal-600 dark:fill-teal-500" />
      <path
        d="M5 18c2.2 0 2.2-3 4.4-3s2.2 3 4.4 3 2.2-3 4.4-3 2.2 3 4.4 3 2.2-3 4.4-3"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.95"
      />
      <path
        d="M5 23c2.2 0 2.2-3 4.4-3s2.2 3 4.4 3 2.2-3 4.4-3 2.2 3 4.4 3 2.2-3 4.4-3"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
    </svg>
  );
}

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-zinc-200 bg-white/80 px-3 backdrop-blur-sm dark:border-zinc-800 dark:bg-black/80 sm:px-6">
      <Link href="/" className="flex shrink-0 items-center gap-2 text-zinc-950 dark:text-zinc-50">
        <WaveMark className="h-6 w-6" />
        <span className="text-sm font-semibold tracking-tight">EduGame</span>
      </Link>

      <nav className="flex min-w-0 items-center gap-0.5 overflow-x-auto text-sm sm:gap-1">
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href || pathname?.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`shrink-0 rounded-full px-2.5 py-1.5 font-medium transition-colors sm:px-3 ${
                active
                  ? "bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
