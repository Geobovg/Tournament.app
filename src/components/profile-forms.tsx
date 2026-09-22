"use client";

import { useActionState, useEffect, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { deleteAccountAction, updateProfileAction, uploadAvatarAction, type AuthActionState } from "@/lib/auth-actions";
import { PasskeyRegistrationForm } from "./auth-forms";
import { buttonClass, cardClass, labelClass, secondaryButtonClass } from "./ui";

const initialState: AuthActionState = {};

const AVATAR_MAX_SIDE = 512;

async function shrinkImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, AVATAR_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale)); const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) { bitmap.close(); throw new Error("Fant ingen tegneflate"); }
  context.drawImage(bitmap, 0, 0, width, height); bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("Klarte ikke å komprimere bildet");
  return new File([blob], "avatar.jpg", { type: "image/jpeg" });
}

function AvatarForm({ username, avatarUrl }: { username: string; avatarUrl: string | null }) {
  const [avatarState, avatarAction, uploading] = useActionState(uploadAvatarAction, initialState);
  const [prepared, setPrepared] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const original = event.target.files?.[0] ?? null;
    setPrepareError(null); setPrepared(null); setPreview(null);
    if (!original) return;
    setPreparing(true);
    try {
      const optimized = await shrinkImage(original);
      setPrepared(optimized); setPreview(URL.createObjectURL(optimized));
    } catch {
      setPrepareError("Klarte ikke å lese bildet. Prøv et annet bilde.");
    } finally {
      setPreparing(false);
    }
  }
  return (
    <section className={`${cardClass} grid gap-4`}>
      <h2 className="text-lg font-semibold">Profilbilde</h2>
      {/* Lokal forhåndsvisning av det nedskalerte bildet: en blob-URL som next/image ikke kan laste. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {preview ? <img src={preview} alt="Nytt profilbilde" width={80} height={80} className="h-20 w-20 rounded-full object-cover" /> : avatarUrl ? <Image src={avatarUrl} alt="Profilbilde" width={80} height={80} className="h-20 w-20 rounded-full object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-soft text-2xl font-semibold text-accent">{username.slice(0, 1).toUpperCase()}</div>}
      <form action={(formData) => { if (prepared) formData.set("avatar", prepared); avatarAction(formData); }} className="grid gap-3">
        <input name="avatar" type="file" accept="image/*" required onChange={handleFile} />
        <p className="text-xs text-muted">Bildet skaleres ned til {AVATAR_MAX_SIDE} px i nettleseren før opplasting, så bilder rett fra mobilkameraet går fint.</p>
        {prepareError ? <p className="text-danger">{prepareError}</p> : null}
        {avatarState.error ? <p className="text-danger">{avatarState.error}</p> : null}
        {avatarState.message ? <p className="text-success">{avatarState.message}</p> : null}
        <button className={secondaryButtonClass} disabled={preparing || uploading || !prepared}>{preparing ? "Behandler bildet…" : uploading ? "Laster opp…" : "Last opp"}</button>
      </form>
    </section>
  );
}

export function ProfileForms({ username, avatarUrl }: { username: string; avatarUrl: string | null }) {
  const [nameState, nameAction, changingName] = useActionState(updateProfileAction, initialState);
  const [deleteState, deleteAction, deleting] = useActionState(deleteAccountAction, initialState);
  return (
    <div className="grid gap-6">
      <AvatarForm username={username} avatarUrl={avatarUrl} />
      <section className={`${cardClass} grid gap-4`}>
        <h2 className="text-lg font-semibold">Brukernavn</h2>
        <form action={nameAction} className="grid gap-3"><div><label className={labelClass} htmlFor="profile-username">Nytt brukernavn</label><input id="profile-username" name="username" defaultValue={username} className="mt-1 w-full" required /></div><div><label className={labelClass} htmlFor="current-code">Sekssifret kode</label><input id="current-code" name="current_code" type="tel" inputMode="numeric" pattern="[0-9]*" maxLength={6} className="mt-1 w-full tracking-[0.35em]" required /></div>{nameState.error ? <p className="text-danger">{nameState.error}</p> : null}{nameState.message ? <p className="text-success">{nameState.message}</p> : null}<button className={buttonClass} disabled={changingName}>{changingName ? "Lagrer…" : "Lagre brukernavn"}</button></form>
      </section>
      <section className={`${cardClass} grid gap-4`}>
        <h2 className="text-lg font-semibold">Face ID / passkey</h2>
        <p className="text-sm text-muted">Registrer Face ID på iPhone eller en passkey på denne enheten for raskere innlogging.</p>
        <PasskeyRegistrationForm />
      </section>
      <section className={`${cardClass} grid gap-4 border-danger`}>
        <h2 className="text-lg font-semibold text-danger">Slett konto</h2>
        <p className="text-sm text-muted">Fullførte turneringer beholdes anonymt. Aktive turneringer må lukkes, slettes eller overføres først.</p>
        <form action={deleteAction} className="grid gap-3"><input name="code" type="tel" inputMode="numeric" pattern="[0-9]*" maxLength={6} placeholder="Sekssifret kode" required />{deleteState.error ? <p className="text-danger">{deleteState.error}</p> : null}<button className="rounded-lg border border-danger px-4 py-2 font-medium text-danger" disabled={deleting}>{deleting ? "Sletter…" : "Slett konto"}</button></form>
      </section>
    </div>
  );
}
