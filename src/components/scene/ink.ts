/** Velger lys eller mørk tekst ut fra hvor lys bakgrunnsfargen er. */
export function inkOn(hex: string): string {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.55 ? "#101820" : "#f5f6f7";
}
