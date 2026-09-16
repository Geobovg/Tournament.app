"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { secondaryButtonClass } from "./ui";

export function JoinByCode() {
  const router = useRouter();
  const [code, setCode] = useState("");
  return <form onSubmit={(event) => { event.preventDefault(); if (/^[a-zA-Z0-9]{6}$/.test(code)) router.push(`/join/code/${code}`); }} className="flex gap-2"><input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="Invitasjonskode" maxLength={6} className="min-w-0 flex-1 uppercase" /><button className={secondaryButtonClass}>Bli med</button></form>;
}
