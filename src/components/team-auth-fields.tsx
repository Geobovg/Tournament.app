import { labelClass } from "./ui";

type TeamOption = { id: string; name: string };

export function TeamAuthFields({
  idPrefix,
  teams,
}: {
  idPrefix: string;
  teams: TeamOption[];
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
          defaultValue=""
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
          defaultValue=""
          autoComplete="off"
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
