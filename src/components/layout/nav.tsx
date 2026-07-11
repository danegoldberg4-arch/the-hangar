import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/maintenance", label: "Maintenance" },
  { href: "/visits", label: "Visits" },
  { href: "/restock", label: "Restock" },
  { href: "/handbook", label: "Handbook" },
];

export async function Nav() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-steel w-full max-w-full overflow-hidden">
      <div className="max-w-[1180px] mx-auto px-3 sm:px-8 flex items-center justify-between h-14 gap-2">
        <Link href="/" className="flex items-center gap-2 group flex-none">
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4 stroke-iron fill-none"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path d="M2 20h20M4 20V9l8-5 8 5v11M9 20v-6h6v6" />
          </svg>
          <span className="font-narrow font-bold uppercase tracking-[0.15em] text-[0.65rem] sm:text-xs text-paper group-hover:text-iron-lt transition-colors hidden xs:inline">
            The Hangar
          </span>
        </Link>

        <div className="flex items-center gap-0.5 min-w-0 overflow-hidden">
          <nav className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide min-w-0">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="font-narrow uppercase tracking-wider text-[0.65rem] sm:text-xs font-semibold px-2 py-1.5 text-galv hover:text-paper hover:bg-steel-3 rounded-md transition-colors whitespace-nowrap flex-none"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <ThemeToggle />

          {session?.user ? (
            <div className="flex items-center gap-1 sm:gap-2 ml-1 sm:ml-2 pl-1 sm:pl-2 border-l border-line flex-none">
              <span className="font-narrow uppercase tracking-wider text-xs text-galv-dim hidden md:block">
                {session.user.name}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <button
                  type="submit"
                  className="text-galv-dim hover:text-iron-lt transition-colors p-1"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              className="font-narrow uppercase tracking-wider text-xs font-bold text-steel bg-sand px-3 py-1.5 rounded-md hover:bg-paper transition-colors ml-2 flex-none"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
