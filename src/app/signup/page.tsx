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
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <svg
            viewBox="0 0 24 24"
            className="w-10 h-10 stroke-iron fill-none mx-auto mb-4"
            strokeWidth={1.5}
          >
            <path d="M2 20h20M4 20V9l8-5 8 5v11M9 20v-6h6v6" />
          </svg>
          <h1 className="font-narrow font-bold uppercase text-2xl tracking-tight text-paper">
            The Hangar
          </h1>
          <p className="eyebrow mt-1">Join the family</p>
        </div>

        <div className="card-surface p-6">
          <h2 className="font-narrow uppercase tracking-wider text-sm font-bold text-galv mb-4">
            Create Account
          </h2>

          {error && (
            <div className="bg-iron/5 border border-iron/20 text-iron text-sm rounded p-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="font-narrow uppercase tracking-wider text-xs text-galv-dim block mb-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Your name"
                className="w-full bg-steel-3 border border-line rounded-lg px-4 py-2.5 text-paper text-sm focus:border-iron focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="font-narrow uppercase tracking-wider text-xs text-galv-dim block mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full bg-steel-3 border border-line rounded-lg px-4 py-2.5 text-paper text-sm focus:border-iron focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="font-narrow uppercase tracking-wider text-xs text-galv-dim block mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Min 6 characters"
                className="w-full bg-steel-3 border border-line rounded-lg px-4 py-2.5 text-paper text-sm focus:border-iron focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="font-narrow uppercase tracking-wider text-xs text-galv-dim block mb-1">
                Invite Code
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Ask the admin for the code"
                className="w-full bg-steel-3 border border-line rounded-lg px-4 py-2.5 text-paper text-sm focus:border-iron focus:outline-none transition-colors"
              />
              <p className="text-xs text-galv-dim mt-1">
                First family member to sign up becomes admin (no code needed).
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
              Have an account?{" "}
              <a href="/login" className="text-iron hover:text-iron-lt transition-colors font-narrow uppercase tracking-wider text-xs">
                Sign in
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
