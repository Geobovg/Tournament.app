const YOUTUBE_ID = /^[A-Za-z0-9_-]{6,20}$/;

export function isHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function toYouTubeEmbedUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, "");
  let id: string | null = null;

  if (host === "youtu.be") {
    id = parsed.pathname.slice(1);
  } else if (host === "youtube.com" || host === "m.youtube.com") {
    if (parsed.pathname === "/watch") id = parsed.searchParams.get("v");
    else if (parsed.pathname.startsWith("/shorts/")) id = parsed.pathname.split("/")[2];
    else if (parsed.pathname.startsWith("/embed/")) id = parsed.pathname.split("/")[2];
  }

  return id && YOUTUBE_ID.test(id) ? `https://www.youtube.com/embed/${id}` : null;
}
