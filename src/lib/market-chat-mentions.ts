// @brukernavn følger samme regler som brukernavn (se validUsername i auth.ts).
const mentionPattern = /(?<![a-zA-Z0-9_.-])@([a-zA-Z0-9_.-]{3,24})/g;

/** Brukernavnene en melding kan nevne. «@geo.» på slutten av en setning prøves også som «geo». */
export function mentionCandidates(body: string): string[] {
  const names = new Set<string>();
  for (const match of body.matchAll(mentionPattern)) {
    names.add(match[1]);
    const trimmed = match[1].replace(/[.-]+$/, "");
    if (trimmed.length >= 3) names.add(trimmed);
  }
  return [...names];
}

/** Deler teksten i vanlige biter og @-nevninger, så nevningene kan utheves. */
export function splitMentions(body: string): { text: string; mention: boolean }[] {
  const parts: { text: string; mention: boolean }[] = [];
  let last = 0;
  for (const match of body.matchAll(mentionPattern)) {
    if (match.index > last) parts.push({ text: body.slice(last, match.index), mention: false });
    parts.push({ text: match[0], mention: true });
    last = match.index + match[0].length;
  }
  if (last < body.length) parts.push({ text: body.slice(last), mention: false });
  return parts;
}

/** Ordet som skrives akkurat nå, hvis det er en påbegynt @-nevning. */
export function mentionInProgress(text: string, caret: number): { start: number; query: string } | null {
  const match = /(^|\s)@([a-zA-Z0-9_.-]{0,24})$/.exec(text.slice(0, caret));
  return match ? { start: caret - match[2].length - 1, query: match[2] } : null;
}
