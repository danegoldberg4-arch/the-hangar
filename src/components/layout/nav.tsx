import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

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
    <header className="sticky top-0 z-50 border-b border-line bg-steel/80 backdrop-blur-xl">
      <div className="max-w-[1180px] mx-auto px-4 sm:px-8 flex items-center justify-between h-14">
        <Link href="/" className="flex items-center gap-2.5 group">
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4 stroke-iron fill-none"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path d="M2 20h20M4 20V9l8-5 8 5v11M9 20v-6h6v6" />
          </svg>
          <span className="font-narrow font-bold uppercase tracking-[0.2em] text-xs text-paper group-hover:text-iron-lt transition-colors">
            The Hangar
          </span>
        </Link>

        <div className="flex items-center gap-0.5">
          <nav className="flex items-center gap-0.5">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="font-narrow uppercase tracking-wider text-xs font-semibold px-3 py-2 text-galv hover:text-paper hover:bg-steel-3 rounded-md transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {session?.user ? (
            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-line">
              <span className="font-narrow uppercase tracking-wider text-xs text-galv-dim hidden sm:block">
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
                  className="font-narrow uppercase tracking-wider text-[0.65rem] text-galv-dim hover:text-iron-lt transition-colors px-2 py-1"
                >
                  Exit
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              className="font-narrow uppercase tracking-wider text-xs font-bold text-steel bg-sand px-3 py-1.5 rounded-md hover:bg-paper transition-colors ml-2"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
