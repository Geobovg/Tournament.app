"use client";

import { useActionState, useEffect, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { deleteAccountAction, updateProfileAction, uploadAvatarAction, type AuthActionState } from "@/lib/auth-actions";
import { useT } from "@/i18n/client";
import type { Dictionary } from "@/i18n/dictionaries";
import { PasskeyRegistrationForm } from "./auth-forms";
import { buttonClass, cardClass, labelClass, secondaryButtonClass } from "./ui";

const initialState: AuthActionState = {};

const AVATAR_MAX_SIDE = 512;

async function shrinkImage(file: File, t: Dictionary): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, AVATAR_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale)); const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) { bitmap.close(); throw new Error(t.profile.avatar.noCanvas); }
  context.drawImage(bitmap, 0, 0, width, height); bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error(t.profile.avatar.compressFailed);
  return new File([blob], "avatar.jpg", { type: "image/jpeg" });
}

function AvatarForm({ username, avatarUrl }: { username: string; avatarUrl: string | null }) {
  const [avatarState, avatarAction, uploading] = useActionState(uploadAvatarAction, initialState);
  const [prepared, setPrepared] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const dict = useT();
  const t = dict.profile.avatar;
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const original = event.target.files?.[0] ?? null;
    setPrepareError(null); setPrepared(null); setPreview(null);
    if (!original) return;
    setPreparing(true);
    try {
      const optimized = await shrinkImage(original, dict);
      setPrepared(optimized); setPreview(URL.createObjectURL(optimized));
    } catch {
      setPrepareError(t.readFailed);
    } finally {
      setPreparing(false);
    }
  }
  return (
    <section className={`${cardClass} grid gap-4`}>
      <h2 className="text-lg font-semibold">{t.title}</h2>
      {/* Lokal forhåndsvisning av det nedskalerte bildet: en blob-URL som next/image ikke kan laste. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {preview ? <img src={preview} alt={t.newAlt} width={80} height={80} className="h-20 w-20 rounded-full object-cover" /> : avatarUrl ? <Image src={avatarUrl} alt={t.alt} width={80} height={80} className="h-20 w-20 rounded-full object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-soft text-2xl font-semibold text-accent">{username.slice(0, 1).toUpperCase()}</div>}
      <form action={(formData) => { if (prepared) formData.set("avatar", prepared); avatarAction(formData); }} className="grid gap-3">
        <input name="avatar" type="file" accept="image/*" required onChange={handleFile} />
        <p className="text-xs text-muted">{t.resizeHint(AVATAR_MAX_SIDE)}</p>
        {prepareError ? <p className="text-danger">{prepareError}</p> : null}
        {avatarState.error ? <p className="text-danger">{avatarState.error}</p> : null}
        {avatarState.message ? <p className="text-success">{avatarState.message}</p> : null}
        <button className={secondaryButtonClass} disabled={preparing || uploading || !prepared}>{preparing ? t.processing : uploading ? t.uploading : t.upload}</button>
      </form>
    </section>
  );
}

export function ProfileForms({ username, avatarUrl }: { username: string; avatarUrl: string | null }) {
  const [nameState, nameAction, changingName] = useActionState(updateProfileAction, initialState);
  const [deleteState, deleteAction, deleting] = useActionState(deleteAccountAction, initialState);
  const t = useT().profile;
  return (
    <div className="grid gap-6">
      <AvatarForm username={username} avatarUrl={avatarUrl} />
      <section className={`${cardClass} grid gap-4`}>
        <h2 className="text-lg font-semibold">{t.username.title}</h2>
        <form action={nameAction} className="grid gap-3"><div><label className={labelClass} htmlFor="profile-username">{t.username.newUsername}</label><input id="profile-username" name="username" defaultValue={username} className="mt-1 w-full" required /></div><div><label className={labelClass} htmlFor="current-code">{t.username.code}</label><input id="current-code" name="current_code" type="tel" inputMode="numeric" pattern="[0-9]*" maxLength={6} className="mt-1 w-full tracking-[0.35em]" required /></div>{nameState.error ? <p className="text-danger">{nameState.error}</p> : null}{nameState.message ? <p className="text-success">{nameState.message}</p> : null}<button className={buttonClass} disabled={changingName}>{changingName ? t.username.saving : t.username.save}</button></form>
      </section>
      <section className={`${cardClass} grid gap-4`}>
        <h2 className="text-lg font-semibold">{t.passkey.title}</h2>
        <p className="text-sm text-muted">{t.passkey.description}</p>
        <PasskeyRegistrationForm />
      </section>
      <section className={`${cardClass} grid gap-4 border-danger`}>
        <h2 className="text-lg font-semibold text-danger">{t.deleteAccount.title}</h2>
        <p className="text-sm text-muted">{t.deleteAccount.description}</p>
        <form action={deleteAction} className="grid gap-3"><input name="code" type="tel" inputMode="numeric" pattern="[0-9]*" maxLength={6} placeholder={t.deleteAccount.codePlaceholder} required />{deleteState.error ? <p className="text-danger">{deleteState.error}</p> : null}<button className="rounded-lg border border-danger px-4 py-2 font-medium text-danger" disabled={deleting}>{deleting ? t.deleteAccount.deleting : t.deleteAccount.submit}</button></form>
      </section>
    </div>
  );
}
