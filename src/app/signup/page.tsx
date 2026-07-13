"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, inviteCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create account");
        return;
      }

      await signIn("credentials", {
        email,
        password,
        redirectTo: "/",
      });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <svg
            viewBox="0 0 24 24"
            className="w-10 h-10 stroke-iron fill-none mx-auto mb-3"
            strokeWidth={1.5}
          >
            <path d="M2 20h20M4 20V9l8-5 8 5v11M9 20v-6h6v6" />
          </svg>
          <h1 className="font-narrow font-bold uppercase text-2xl tracking-tight text-paper">
            The Hangar
          </h1>
          <p className="text-sm text-galv-dim mt-1">
            Upper Kangaroo River · NSW
          </p>
        </div>

        <div className="card-surface p-6">
          <h2 className="font-narrow uppercase tracking-wider text-sm font-bold text-galv mb-2">
            Join the family
          </h2>
          <p className="text-xs text-galv-dim mb-4 leading-relaxed">
            Create an account to see house status, log maintenance, plan visits, and note what needs restocking.
          </p>

          {error && (
            <div className="bg-iron/5 border border-iron/20 text-iron text-sm rounded p-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="signup-name" className="font-narrow uppercase tracking-wider text-xs text-galv-dim block mb-1">
                Your name
              </label>
              <input
                type="text"
                id="signup-name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Dane"
                className="w-full bg-steel-3 border border-line rounded-lg px-4 py-2.5 text-paper text-sm focus:border-iron focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label htmlFor="signup-email" className="font-narrow uppercase tracking-wider text-xs text-galv-dim block mb-1">
                Email
              </label>
              <input
                type="email"
                id="signup-email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full bg-steel-3 border border-line rounded-lg px-4 py-2.5 text-paper text-sm focus:border-iron focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label htmlFor="signup-password" className="font-narrow uppercase tracking-wider text-xs text-galv-dim block mb-1">
                Password
              </label>
              <input
                type="password"
                id="signup-password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={12}
                maxLength={72}
                placeholder="12 characters minimum"
                className="w-full bg-steel-3 border border-line rounded-lg px-4 py-2.5 text-paper text-sm focus:border-iron focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label htmlFor="invite-code" className="font-narrow uppercase tracking-wider text-xs text-galv-dim block mb-1">
                Registration code
              </label>
              <input
                type="password"
                id="invite-code"
                autoComplete="off"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Private code"
                className="w-full bg-steel-3 border border-line rounded-lg px-4 py-2.5 text-paper text-sm focus:border-iron focus:outline-none transition-colors"
              />
              <p className="text-xs text-galv-dim mt-1">
                Ask the family admin for a code. The initial admin uses the private bootstrap code.
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full font-narrow uppercase tracking-wider text-xs font-bold text-steel bg-sand px-5 py-2.5 rounded-md hover:bg-paper transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating..." : "Create Account"}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-line text-center">
            <p className="text-sm text-galv-dim">
              Already have an account?{" "}
              <a href="/login" className="text-iron hover:text-iron-lt transition-colors font-narrow uppercase tracking-wider text-xs">
                Sign in
              </a>
            </p>
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-galv-dim">
            After signing in, add to your home screen for app-like access.
          </p>
          <p className="text-xs text-galv-dim mt-1">
            <a href="/handbook" className="text-iron hover:text-iron-lt transition-colors">
              Just visiting? View the house handbook →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
