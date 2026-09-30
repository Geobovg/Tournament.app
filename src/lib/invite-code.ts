// Samme tegn og lengde som generate_invite_code() i 0041_security_fixes.sql.
// Uten I, O, 0 og 1 så koden er lett å lese og skrive av.
export const INVITE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const INVITE_CODE_LENGTH = 8;

export function validInviteCode(value: string) {
  return new RegExp(`^[${INVITE_CODE_ALPHABET}]{${INVITE_CODE_LENGTH}}$`).test(value.toUpperCase());
}
