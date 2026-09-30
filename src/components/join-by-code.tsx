"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/i18n/client";
import { INVITE_CODE_LENGTH, validInviteCode } from "@/lib/invite-code";
import { secondaryButtonClass } from "./ui";

export function JoinByCode() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const t = useT();
  return <form onSubmit={(event) => { event.preventDefault(); if (validInviteCode(code)) router.push(`/join/code/${code}`); }} className="flex gap-2"><input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder={t.auth.join.codePlaceholder} maxLength={INVITE_CODE_LENGTH} className="min-w-0 flex-1 uppercase" /><button className={secondaryButtonClass}>{t.auth.join.codeSubmit}</button></form>;
}
