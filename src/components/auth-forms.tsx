"use client";

import Link from "next/link";
import { useActionState, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import {
  changeCodeAction,
  loginAction,
  registerAction,
  passkeyRegistrationSessionAction,
  sendRecoveryAction,
  type AuthActionState,
} from "@/lib/auth-actions";
import { useT } from "@/i18n/client";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { buttonClass, cardClass, labelClass, secondaryButtonClass } from "./ui";

const initialState: AuthActionState = {};

// type="password" og autoComplete gjør at nettleseren/nøkkelringen tilbyr å lagre brukernavn og kode.
function CodeInput({ name, label, id, onChange, autoComplete = "current-password" }: { name: string; label: string; id: string; onChange?: (value: string) => void; autoComplete?: "current-password" | "new-password" }) {
  return (
    <div>
      <label className={labelClass} htmlFor={id}>{label}</label>
      <input id={id} name={name} type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6} autoComplete={autoComplete} className="mt-1 w-full tracking-[0.35em]" onChange={(event) => onChange?.(event.target.value.replace(/\D/g, ""))} required />
    </div>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);
  const params = useSearchParams();
  const next = params.get("next") ?? "";
  const t = useT().auth.login;
  return (
    <form action={action} className={`${cardClass} grid gap-4`}>
      <input type="hidden" name="next" value={next} />
      <div><label className={labelClass} htmlFor="username">{t.username}</label><input id="username" name="username" autoComplete="username" className="mt-1 w-full" required /></div>
      <CodeInput id="login-code" name="code" label={t.code} />
      {state.error ? <p className="text-danger">{state.error}</p> : null}
      <button className={buttonClass} disabled={pending}>{pending ? t.submitting : t.submit}</button>
      <PasskeyLoginButton next={next} />
      <div className="flex justify-between text-sm"><Link href="/forgot-code" className="text-accent underline">{t.forgotCode}</Link><Link href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"} className="text-accent underline">{t.newUser}</Link></div>
    </form>
  );
}

function PasskeyLoginButton({ next }: { next: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const dict = useT();
  const t = dict.auth.passkey;

  async function signIn() {
    setPending(true);
    setMessage(null);
    try {
      const { data, error } = await supabaseBrowser(dict).auth.signInWithPasskey();
      if (error || !data.session) throw new Error(error?.message ?? t.signInFailed);
      const response = await fetch("/auth/passkey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: data.session.access_token, next }),
      });
      const result = await response.json() as { error?: string; next?: string };
      if (!response.ok) throw new Error(result.error ?? t.loginFailed);
      window.location.assign(result.next ?? "/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t.loginFailed);
      setPending(false);
    }
  }

  return <div className="grid gap-2"><button type="button" className={secondaryButtonClass} onClick={signIn} disabled={pending}>{pending ? t.checking : t.signIn}</button>{message ? <p className="text-danger">{message}</p> : null}</div>;
}

export function PasskeyRegistrationForm() {
  const [state, setState] = useState<AuthActionState>({});
  const [pending, setPending] = useState(false);
  const dict = useT();
  const t = dict.auth.passkey;

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setState({});
    const result = await passkeyRegistrationSessionAction(new FormData(form));
    if (!result.ok || !result.access_token || !result.refresh_token) {
      setState(result);
      setPending(false);
      return;
    }
    try {
      const auth = supabaseBrowser(dict);
      const session = await auth.auth.setSession({ access_token: result.access_token, refresh_token: result.refresh_token });
      if (session.error) throw session.error;
      const registered = await auth.auth.registerPasskey();
      if (registered.error) throw registered.error;
      await auth.auth.signOut({ scope: "local" });
      setState({ ok: true, message: t.registered });
      form.reset();
    } catch (error) {
      setState({ error: error instanceof Error ? error.message : t.registerFailed });
    } finally {
      setPending(false);
    }
  }

  return <form onSubmit={register} className="grid gap-3"><CodeInput id="passkey-code" name="code" label={t.confirmCode} />{state.error ? <p className="text-danger">{state.error}</p> : null}{state.message ? <p className="text-success">{state.message}</p> : null}<button className={secondaryButtonClass} disabled={pending}>{pending ? t.registering : t.activate}</button></form>;
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, initialState);
  const next = useSearchParams().get("next") ?? "";
  const [code, setCode] = useState("");
  const [confirm, setConfirm] = useState("");
  const status = confirm.length !== 6 ? "idle" : code === confirm ? "good" : "bad";
  const t = useT().auth.register;
  return (
    <form action={action} className={`${cardClass} grid gap-4`}>
      <input type="hidden" name="next" value={next} />
      <div><label className={labelClass} htmlFor="register-username">{t.username}</label><input id="register-username" name="username" autoComplete="username" minLength={3} maxLength={24} className="mt-1 w-full" required /><p className="mt-1 text-sm text-muted">{t.usernameHint}</p></div>
      <CodeInput id="register-code" name="code" label={t.chooseCode} autoComplete="new-password" onChange={setCode} />
      <div className="relative"><CodeInput id="register-confirm-code" name="confirm_code" label={t.repeatCode} autoComplete="new-password" onChange={setConfirm} />{status !== "idle" ? <span className={`absolute right-3 top-9 text-lg ${status === "good" ? "text-success" : "text-danger"}`}>{status === "good" ? "✓" : "✕"}</span> : null}</div>
      {state.error ? <p className="text-danger">{state.error}</p> : null}
      {state.message ? <p className="text-success">{state.message}</p> : null}
      <button className={buttonClass} disabled={pending || status === "bad"}>{pending ? t.submitting : t.submit}</button>
      <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="text-center text-sm text-accent underline">{t.haveAccount}</Link>
    </form>
  );
}

export function RecoveryForm() {
  const [state, action, pending] = useActionState(sendRecoveryAction, initialState);
  const t = useT().auth.recovery;
  return <form action={action} className={`${cardClass} grid gap-4`}><div><label className={labelClass} htmlFor="recovery-email">{t.email}</label><input id="recovery-email" name="email" type="email" autoComplete="email" className="mt-1 w-full" required /></div>{state.error ? <p className="text-danger">{state.error}</p> : null}{state.message ? <p className="text-success">{state.message}</p> : null}<button className={buttonClass} disabled={pending}>{pending ? t.submitting : t.submit}</button></form>;
}

export function ResetCodeForm() {
  const [state, action, pending] = useActionState(changeCodeAction, initialState);
  const [code, setCode] = useState("");
  const [confirm, setConfirm] = useState("");
  const matching = confirm.length === 6 && code === confirm;
  const invalid = confirm.length === 6 && code !== confirm;
  const t = useT().auth.resetCode;
  return <form action={action} className={`${cardClass} grid gap-4`}><CodeInput id="new-code" name="code" label={t.newCode} autoComplete="new-password" onChange={setCode} /><div className="relative"><CodeInput id="confirm-new-code" name="confirm_code" label={t.repeatCode} autoComplete="new-password" onChange={setConfirm} />{confirm.length === 6 ? <span className={`absolute right-3 top-9 text-lg ${matching ? "text-success" : "text-danger"}`}>{matching ? "✓" : "✕"}</span> : null}</div>{state.error ? <p className="text-danger">{state.error}</p> : null}{state.message ? <p className="text-success">{state.message}</p> : null}<button className={buttonClass} disabled={pending || invalid}>{pending ? t.submitting : t.submit}</button></form>;
}
