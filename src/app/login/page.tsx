import { auth, signIn } from "@/lib/auth";
import { HangarBrand } from "@/components/brand/hangar-brand";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; from?: string }>;
}) {
  const { error, from } = await searchParams;
  const session = await auth();
  if (session) redirect("/");

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <HangarBrand
            variant="lockup"
            alt=""
            className="w-full max-w-[19rem] mx-auto"
          />
          <h1 className="sr-only">The Hangar</h1>
          <p className="eyebrow mt-3">Upper Kangaroo River</p>
        </div>

        <div className="card-surface p-6">
          <h2 className="font-narrow uppercase tracking-wider text-sm font-bold text-galv mb-4">
            Sign In
          </h2>

          {error && (
            <div className="bg-iron/5 border border-iron/20 text-iron text-sm rounded p-3 mb-4">
              {error === "CredentialsSignin"
                ? "Invalid email or password"
                : "Something went wrong"}
            </div>
          )}

          <form
            action={async (formData) => {
              "use server";
              await signIn("credentials", {
                email: formData.get("email"),
                password: formData.get("password"),
                redirectTo: from || "/",
              });
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="email" className="font-narrow uppercase tracking-wider text-xs text-galv-dim block mb-1">
                Email
              </label>
              <input
                name="email"
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="dane@example.com"
                className="w-full bg-steel-3 border border-line rounded-lg px-4 py-2.5 text-paper text-sm focus:border-iron focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label htmlFor="password" className="font-narrow uppercase tracking-wider text-xs text-galv-dim block mb-1">
                Password
              </label>
              <input
                name="password"
                id="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full bg-steel-3 border border-line rounded-lg px-4 py-2.5 text-paper text-sm focus:border-iron focus:outline-none transition-colors"
              />
            </div>
            <button
              type="submit"
              className="w-full font-narrow uppercase tracking-wider text-xs font-bold text-steel bg-sand px-5 py-2.5 rounded-md hover:bg-paper transition-colors"
            >
              Sign In
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-line text-center">
            <p className="text-sm text-galv-dim">
              No account?{" "}
              <a href="/signup" className="text-iron hover:text-iron-lt transition-colors font-narrow uppercase tracking-wider text-xs">
                Sign up
              </a>
            </p>
          </div>
        </div>

        <p className="text-center mt-4 text-xs text-galv-dim">
          <a href="/handbook" className="hover:text-galv transition-colors">
            Guest? View the house handbook →
          </a>
        </p>
      </div>
    </div>
  );
}
