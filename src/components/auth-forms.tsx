"use client";

import Link from "next/link";
import { useActionState, useState, useTransition, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import {
  changeCodeAction,
  isAccountCodeAvailable,
  loginAction,
  registerAction,
  passkeyRegistrationSessionAction,
  sendRecoveryAction,
  type AuthActionState,
} from "@/lib/auth-actions";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { buttonClass, cardClass, labelClass, secondaryButtonClass } from "./ui";

const initialState: AuthActionState = {};

function CodeInput({ name, label, id, onChange }: { name: string; label: string; id: string; onChange?: (value: string) => void }) {
  return (
    <div>
      <label className={labelClass} htmlFor={id}>{label}</label>
      <input id={id} name={name} type="tel" inputMode="numeric" pattern="[0-9]*" maxLength={6} autoComplete="one-time-code" className="mt-1 w-full tracking-[0.35em]" onChange={(event) => onChange?.(event.target.value.replace(/\D/g, ""))} required />
    </div>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);
  const params = useSearchParams();
  const next = params.get("next") ?? "";
  return (
    <form action={action} className={`${cardClass} grid gap-4`}>
      <input type="hidden" name="next" value={next} />
      <div><label className={labelClass} htmlFor="username">Brukernavn</label><input id="username" name="username" autoComplete="username" className="mt-1 w-full" required /></div>
      <CodeInput id="login-code" name="code" label="Sekssifret kode" />
      {state.error ? <p className="text-danger">{state.error}</p> : null}
      <button className={buttonClass} disabled={pending}>{pending ? "Logger inn…" : "Logg inn"}</button>
      <PasskeyLoginButton next={next} />
      <div className="flex justify-between text-sm"><Link href="/forgot-code" className="text-accent underline">Glemt kode?</Link><Link href="/register" className="text-accent underline">Ny bruker</Link></div>
    </form>
  );
}

function PasskeyLoginButton({ next }: { next: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function signIn() {
    setPending(true);
    setMessage(null);
    try {
      const { data, error } = await supabaseBrowser().auth.signInWithPasskey();
      if (error || !data.session) throw new Error(error?.message ?? "Face ID kunne ikke logge inn");
      const response = await fetch("/auth/passkey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: data.session.access_token, next }),
      });
      const result = await response.json() as { error?: string; next?: string };
      if (!response.ok) throw new Error(result.error ?? "Face ID-innlogging mislyktes");
      window.location.assign(result.next ?? "/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Face ID-innlogging mislyktes");
      setPending(false);
    }
  }

  return <div className="grid gap-2"><button type="button" className={secondaryButtonClass} onClick={signIn} disabled={pending}>{pending ? "Sjekker Face ID…" : "Logg inn med Face ID / passkey"}</button>{message ? <p className="text-danger">{message}</p> : null}</div>;
}

export function PasskeyRegistrationForm() {
  const [state, setState] = useState<AuthActionState>({});
  const [pending, setPending] = useState(false);

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
      const auth = supabaseBrowser();
      const session = await auth.auth.setSession({ access_token: result.access_token, refresh_token: result.refresh_token });
      if (session.error) throw session.error;
      const registered = await auth.auth.registerPasskey();
      if (registered.error) throw registered.error;
      await auth.auth.signOut({ scope: "local" });
      setState({ ok: true, message: "Face ID er registrert. Du kan bruke Face ID neste gang du logger inn." });
      form.reset();
    } catch (error) {
      setState({ error: error instanceof Error ? error.message : "Kunne ikke registrere Face ID" });
    } finally {
      setPending(false);
    }
  }

  return <form onSubmit={register} className="grid gap-3"><CodeInput id="passkey-code" name="code" label="Bekreft med sekssifret kode" />{state.error ? <p className="text-danger">{state.error}</p> : null}{state.message ? <p className="text-success">{state.message}</p> : null}<button className={secondaryButtonClass} disabled={pending}>{pending ? "Registrerer…" : "Aktiver Face ID / passkey"}</button></form>;
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, initialState);
  const [code, setCode] = useState("");
  const [confirm, setConfirm] = useState("");
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, startCheck] = useTransition();
  const check = (nextCode: string, nextConfirm: string) => {
    setAvailable(null);
    if (nextCode.length === 6 && nextCode === nextConfirm) startCheck(async () => setAvailable(await isAccountCodeAvailable(nextCode)));
  };
  const status = confirm.length !== 6 ? "idle" : code !== confirm || available === false ? "bad" : available === true && !checking ? "good" : "idle";
  return (
    <form action={action} className={`${cardClass} grid gap-4`}>
      <div><label className={labelClass} htmlFor="register-username">Brukernavn</label><input id="register-username" name="username" autoComplete="username" minLength={3} maxLength={24} className="mt-1 w-full" required /><p className="mt-1 text-sm text-muted">3–24 tegn. Bokstaver, tall, punktum, bindestrek og understrek.</p></div>
      <div><label className={labelClass} htmlFor="register-email">E-post</label><input id="register-email" name="email" type="email" autoComplete="email" className="mt-1 w-full" required /></div>
      <CodeInput id="register-code" name="code" label="Velg sekssifret kode" onChange={(value) => { setCode(value); check(value, confirm); }} />
      <div className="relative"><CodeInput id="register-confirm-code" name="confirm_code" label="Tast inn koden en gang til" onChange={(value) => { setConfirm(value); check(code, value); }} />{status !== "idle" ? <span className={`absolute right-3 top-9 text-lg ${status === "good" ? "text-success" : "text-danger"}`}>{status === "good" ? "✓" : "✕"}</span> : null}{checking ? <span className="absolute right-3 top-9 text-xs text-muted">Sjekker…</span> : null}</div>
      {state.error ? <p className="text-danger">{state.error}</p> : null}
      {state.message ? <p className="text-success">{state.message}</p> : null}
      <button className={buttonClass} disabled={pending || status === "bad"}>{pending ? "Oppretter…" : "Opprett bruker"}</button>
      <Link href="/login" className="text-center text-sm text-accent underline">Har du allerede en bruker? Logg inn</Link>
    </form>
  );
}

export function RecoveryForm() {
  const [state, action, pending] = useActionState(sendRecoveryAction, initialState);
  return <form action={action} className={`${cardClass} grid gap-4`}><div><label className={labelClass} htmlFor="recovery-email">E-post</label><input id="recovery-email" name="email" type="email" autoComplete="email" className="mt-1 w-full" required /></div>{state.error ? <p className="text-danger">{state.error}</p> : null}{state.message ? <p className="text-success">{state.message}</p> : null}<button className={buttonClass} disabled={pending}>{pending ? "Sender…" : "Send lenke for å endre kode"}</button></form>;
}

export function ResetCodeForm() {
  const [state, action, pending] = useActionState(changeCodeAction, initialState);
  const [code, setCode] = useState("");
  const [confirm, setConfirm] = useState("");
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, startCheck] = useTransition();
  const check = (nextCode: string, nextConfirm: string) => { setAvailable(null); if (nextCode.length === 6 && nextCode === nextConfirm) startCheck(async () => setAvailable(await isAccountCodeAvailable(nextCode))); };
  const matching = confirm.length === 6 && code === confirm && available === true && !checking;
  const invalid = confirm.length === 6 && (code !== confirm || available === false);
  return <form action={action} className={`${cardClass} grid gap-4`}><CodeInput id="new-code" name="code" label="Tast inn den nye koden din her" onChange={(value) => { setCode(value); check(value, confirm); }} /><div className="relative"><CodeInput id="confirm-new-code" name="confirm_code" label="Tast inn den nye koden en gang til" onChange={(value) => { setConfirm(value); check(code, value); }} />{confirm.length === 6 && !checking ? <span className={`absolute right-3 top-9 text-lg ${matching ? "text-success" : "text-danger"}`}>{matching ? "✓" : "✕"}</span> : null}</div>{state.error ? <p className="text-danger">{state.error}</p> : null}{state.message ? <p className="text-success">{state.message}</p> : null}<button className={buttonClass} disabled={pending || invalid || checking}>{pending ? "Endrer…" : "Bekreft kode"}</button></form>;
}
