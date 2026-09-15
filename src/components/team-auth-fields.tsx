"use client";

import { useEffect, useState } from "react";
import { labelClass } from "./ui";

type TeamOption = { id: string; name: string };

function storageKey(tournamentId: string) {
  return `futebol:team:${tournamentId}`;
}

export function useTeamSession(tournamentId: string) {
  const [teamId, setTeamId] = useState("");
  const [pin, setPin] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(tournamentId));
      if (!raw) return;
      const parsed = JSON.parse(raw) as { teamId?: string; pin?: string };
      setTeamId(parsed.teamId ?? "");
      setPin(parsed.pin ?? "");
    } catch {
      // Ignore unreadable or blocked storage; the fields just start empty.
    }
  }, [tournamentId]);

  const update = (next: { teamId?: string; pin?: string }) => {
    const nextTeamId = next.teamId ?? teamId;
    const nextPin = next.pin ?? pin;
    setTeamId(nextTeamId);
    setPin(nextPin);
    try {
      localStorage.setItem(
        storageKey(tournamentId),
        JSON.stringify({ teamId: nextTeamId, pin: nextPin }),
      );
    } catch {
      // Storage is a convenience only.
    }
  };

  return { teamId, pin, update };
}

export function TeamAuthFields({
  idPrefix,
  teams,
  session,
}: {
  idPrefix: string;
  teams: TeamOption[];
  session: ReturnType<typeof useTeamSession>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className={labelClass} htmlFor={`team-${idPrefix}`}>
          Ditt lag
        </label>
        <select
          id={`team-${idPrefix}`}
          name="team_id"
          value={session.teamId}
          onChange={(event) => session.update({ teamId: event.target.value })}
          className="mt-1 w-full"
          required
        >
          <option value="">Velg lag</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass} htmlFor={`pin-${idPrefix}`}>
          PIN-kode
        </label>
        <input
          id={`pin-${idPrefix}`}
          name="pin"
          value={session.pin}
          onChange={(event) => session.update({ pin: event.target.value })}
          inputMode="numeric"
          maxLength={4}
          placeholder="4 siffer"
          className="mt-1 w-full"
          required
        />
      </div>
    </div>
  );
}
