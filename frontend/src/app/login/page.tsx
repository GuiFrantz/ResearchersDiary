"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errMsg, setToken } from "@/lib/api";
import { TEXT } from "@/lib/constants";
import type { Token } from "@/lib/types";
import { Banner, Button, Field, Input } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = isRegister
        ? await api<Token>("POST", "/api/auth/register", { email, password, name: name.trim() || null })
        : await api<Token>("POST", "/api/auth/login", { email, password });
      setToken(data.access_token);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  }

  function tab(target: "login" | "register", label: string) {
    return (
      <button
        type="button"
        onClick={() => { setMode(target); setError(""); }}
        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${mode === target ? "bg-white text-ink shadow-sm" : "text-dust-600"}`}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">{TEXT.common.appName}</h1>
        </div>

        <div className="flex mb-4 bg-dust-100 rounded-lg p-0.5">
          {tab("login", TEXT.login.signIn)}
          {tab("register", TEXT.login.register)}
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-dust-300 p-6">
          {error && <Banner tone="error" className="mb-4">{error}</Banner>}
          {isRegister && (
            <Field label={TEXT.login.name}>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={TEXT.login.namePlaceholder}
                className="w-full"
              />
            </Field>
          )}
          <Field label={TEXT.login.email}>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={TEXT.login.emailPlaceholder}
              className="w-full"
            />
          </Field>
          <Field label={TEXT.login.password}>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={isRegister ? 8 : undefined}
              placeholder={isRegister ? TEXT.login.passwordHintRegister : TEXT.login.passwordHintLogin}
              className="w-full"
            />
          </Field>
          <Button type="submit" disabled={loading} className="w-full">
            {loading
              ? (isRegister ? TEXT.login.creatingAccount : TEXT.login.signingIn)
              : (isRegister ? TEXT.login.createAccount : TEXT.login.signIn)}
          </Button>
        </form>
      </div>
    </div>
  );
}
