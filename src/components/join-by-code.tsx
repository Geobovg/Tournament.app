"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { INVITE_CODE_LENGTH, validInviteCode } from "@/lib/invite-code";
import { secondaryButtonClass } from "./ui";

export function JoinByCode() {
  const router = useRouter();
  const [code, setCode] = useState("");
  return <form onSubmit={(event) => { event.preventDefault(); if (validInviteCode(code)) router.push(`/join/code/${code}`); }} className="flex gap-2"><input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="Invitasjonskode" maxLength={INVITE_CODE_LENGTH} className="min-w-0 flex-1 uppercase" /><button className={secondaryButtonClass}>Bli med</button></form>;
}
