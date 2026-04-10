"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken } from "@/lib/api";
import type { Token, DemoSeedResponse } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Clear any stale demo credentials from a previous demo session
      localStorage.removeItem("rd_demo_creds");
      if (mode === "register") {
        const data = await api<Token>("POST", "/api/auth/register", {
          email,
          password,
          name: name.trim() || null,
        });
        setToken(data.access_token);
      } else {
        const data = await api<Token>("POST", "/api/auth/login", { email, password });
        setToken(data.access_token);
      }
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : (mode === "register" ? "Registration failed" : "Login failed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleSeedAndLogin() {
    setError("");
    setSeeding(true);
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const data = await api<DemoSeedResponse>("POST", "/api/demo/seed");
        localStorage.setItem("rd_demo_creds", JSON.stringify(data.credentials));
        const admin = data.credentials.find((c) => c.role === "admin");
        if (admin) {
          setToken(admin.token);
          router.push("/dashboard");
        }
        setSeeding(false);
        return;
      } catch {
        if (attempt < 2) await new Promise((r) => setTimeout(r, 1000));
      }
    }
    setError("Backend not ready yet — please try again.");
    setSeeding(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Researcher&apos;s Diary</h1>
          <p className="text-sm text-gray-500 mt-1">
            {mode === "login" ? "Sign in to manage your academic records" : "Create your account"}
          </p>
        </div>

        {/* Tab toggle */}
        <div className="flex mb-4 bg-gray-100 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => { setMode("login"); setError(""); }}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${mode === "login" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode("register"); setError(""); }}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${mode === "register" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          {mode === "register" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Your name (optional)"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === "register" ? 8 : undefined}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder={mode === "register" ? "At least 8 characters" : "Enter your password"}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? (mode === "register" ? "Creating account..." : "Signing in...") : (mode === "register" ? "Create Account" : "Sign In")}
          </button>
        </form>

        <div className="mt-4">
          <div className="relative flex items-center justify-center">
            <span className="text-xs text-gray-400 bg-gray-50 px-2">or</span>
          </div>
          <button
            onClick={handleSeedAndLogin}
            disabled={seeding}
            className="mt-3 w-full py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {seeding ? "Setting up demo..." : "Launch Demo Environment"}
          </button>
        </div>
      </div>
    </div>
  );
}
