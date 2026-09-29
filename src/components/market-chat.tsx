"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition, type KeyboardEvent } from "react";
import type { MarketChatMessage, MarketChatUnread } from "@/lib/market-chat";
import { deleteMarketChatMessageAction, loadMarketChatAction, marketChatUnreadAction, sendMarketChatAction, suggestMentionsAction } from "@/lib/market-chat-actions";
import { mentionInProgress, splitMentions } from "@/lib/market-chat-mentions";
import { buttonClass } from "./ui";

export const marketChatReadEvent = "market-chat-read";
const maxLength = 300;

// Samme bredde som lg i Tailwind: der ligger chatten som fast panel ved siden av annonsene.
const wideQuery = "(min-width: 1024px)";
function subscribeWide(onChange: () => void) {
  const query = window.matchMedia(wideQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
function useWide() {
  return useSyncExternalStore(subscribeWide, () => window.matchMedia(wideQuery).matches, () => false);
}

export function UnreadBadge({ unread, className = "" }: { unread: MarketChatUnread; className?: string }) {
  if (!unread.count) return null;
  return <span className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-black leading-5 ${unread.mentioned ? "bg-amber-400 text-black" : "bg-danger text-white"} ${className}`} aria-label={`${unread.count} uleste meldinger${unread.mentioned ? ", du er nevnt" : ""}`}>
    {unread.mentioned ? "@ " : ""}{unread.count > 50 ? "50+" : unread.count}
  </span>;
}

function clock(iso: string) {
  const date = new Date(iso);
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay ? date.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" }) : date.toLocaleString("nb-NO", { weekday: "short", hour: "2-digit", minute: "2-digit" });
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  return url ? <Image src={url} alt="" width={32} height={32} className="h-8 w-8 shrink-0 rounded-full object-cover" /> : <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-bold text-accent">{name.slice(0, 1).toUpperCase()}</span>;
}

function MessageRow({ message, own, onDelete }: { message: MarketChatMessage; own: boolean; onDelete: (id: string) => void }) {
  return <li className={`flex gap-2 ${own ? "flex-row-reverse" : ""}`}>
    <Avatar name={message.author_name} url={message.author_avatar} />
    <div className={`group min-w-0 max-w-[80%] rounded-xl px-3 py-2 ${own ? "bg-accent-soft" : message.mentions_me ? "bg-amber-400/15 ring-1 ring-amber-400/60" : "bg-surface-raised"}`}>
      <p className={`flex items-baseline gap-2 text-xs ${own ? "justify-end" : ""}`}>
        <b className={own ? "text-accent" : ""}>{own ? "Du" : message.author_name}</b>
        <span className="text-muted" suppressHydrationWarning>{clock(message.created_at)}</span>
        {own ? <button type="button" onClick={() => onDelete(message.id)} className="text-muted underline-offset-2 hover:text-danger hover:underline" aria-label="Slett meldingen">Slett</button> : null}
      </p>
      <p className="mt-0.5 whitespace-pre-wrap break-words text-sm">{splitMentions(message.body).map((part, index) => part.mention ? <b key={index} className="text-accent">{part.text}</b> : part.text)}</p>
    </div>
  </li>;
}

function Composer({ onSent }: { onSent: () => void }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, startSending] = useTransition();
  const [caret, setCaret] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mention = mentionInProgress(text, caret);
  const query = mention?.query ?? "";

  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    const timer = setTimeout(() => { suggestMentionsAction(query).then((names) => { if (!cancelled) { setSuggestions(names); setHighlighted(0); } }); }, 150);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query]);
  const shown = query ? suggestions : [];

  const pick = (name: string) => {
    if (!mention) return;
    const next = `${text.slice(0, mention.start)}@${name} ${text.slice(caret)}`;
    const nextCaret = mention.start + name.length + 2;
    setText(next); setCaret(nextCaret); setSuggestions([]);
    requestAnimationFrame(() => { inputRef.current?.focus(); inputRef.current?.setSelectionRange(nextCaret, nextCaret); });
  };

  const send = () => {
    const body = text.trim();
    if (!body || sending) return;
    const formData = new FormData(); formData.set("body", body);
    startSending(async () => {
      const result = await sendMarketChatAction({}, formData);
      if (result.error) { setError(result.error); return; }
      setError(null); setText(""); setCaret(0); onSent();
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (shown.length) {
      if (event.key === "ArrowDown") { event.preventDefault(); setHighlighted((index) => (index + 1) % shown.length); return; }
      if (event.key === "ArrowUp") { event.preventDefault(); setHighlighted((index) => (index - 1 + shown.length) % shown.length); return; }
      if (event.key === "Enter" || event.key === "Tab") { event.preventDefault(); pick(shown[highlighted] ?? shown[0]); return; }
      if (event.key === "Escape") { event.preventDefault(); setSuggestions([]); return; }
    }
    // Enter sender, Shift+Enter gir ny linje.
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); }
  };

  return <form onSubmit={(event) => { event.preventDefault(); send(); }} className="relative grid gap-1 border-t border-border p-3">
    {shown.length ? <ul role="listbox" aria-label="Nevn en manager" className="absolute inset-x-3 bottom-full mb-1 overflow-hidden rounded-lg border border-border bg-background shadow-xl">
      {shown.map((name, index) => <li key={name} role="option" aria-selected={index === highlighted}>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => pick(name)} className={`block w-full px-3 py-2 text-left text-sm ${index === highlighted ? "bg-accent-soft text-accent" : "hover:bg-surface-raised"}`}>@{name}</button>
      </li>)}
    </ul> : null}
    <div className="flex items-end gap-2">
      <textarea ref={inputRef} rows={1} value={text} maxLength={maxLength} placeholder="Skriv til markedet… (@ for å nevne)" aria-label="Melding"
        onChange={(event) => { setText(event.target.value); setCaret(event.target.selectionStart); }}
        onSelect={(event) => setCaret(event.currentTarget.selectionStart)}
        onKeyDown={onKeyDown}
        className="max-h-28 min-h-10 w-full resize-none" />
      <button className={buttonClass} disabled={sending || !text.trim()}>Send</button>
    </div>
    <div className="flex justify-between gap-2 text-xs">
      <span className="text-danger">{error}</span>
      <span className="text-muted tabular-nums">{text.length} / {maxLength}</span>
    </div>
  </form>;
}

/** Markedschatten: panel ved siden av annonsene på PC, knapp som åpner et vindu på mobil. */
export function MarketChat({ userId, initialMessages, initialUnread }: { userId: string; initialMessages: MarketChatMessage[]; initialUnread: MarketChatUnread }) {
  const wide = useWide();
  const [open, setOpen] = useState(false);
  const visible = wide || open;
  const [messages, setMessages] = useState(initialMessages);
  const [unread, setUnread] = useState(initialUnread);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const stickToBottom = useRef(true);

  const load = useCallback(async () => {
    const next = await loadMarketChatAction(true);
    setMessages(next); setUnread({ count: 0, mentioned: false });
    window.dispatchEvent(new Event(marketChatReadEvent));
  }, []);

  // Åpen chat henter nytt hvert 3. sekund og merker alt som lest. Lukket chat sjekker bare telleren.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      if (visible) load().catch(() => undefined);
      else marketChatUnreadAction().then(setUnread).catch(() => undefined);
    };
    if (visible) tick();
    const timer = setInterval(tick, visible ? 3_000 : 30_000);
    return () => clearInterval(timer);
  }, [load, visible]);

  // Ny melding ruller ned, men bare hvis man allerede sto nederst og ikke leste noe eldre.
  useEffect(() => {
    const list = listRef.current;
    if (list && stickToBottom.current) list.scrollTop = list.scrollHeight;
  }, [messages, visible]);

  useEffect(() => {
    if (!open || wide) return;
    const onKey = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, wide]);

  const remove = async (id: string) => {
    setMessages((current) => current.filter((message) => message.id !== id));
    const result = await deleteMarketChatMessageAction(id);
    if (result.error) setError(result.error);
    load().catch(() => undefined);
  };

  return <>
    <button type="button" onClick={() => setOpen(true)} className="fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-full bg-accent px-4 py-3 font-bold text-accent-contrast shadow-xl lg:hidden">
      💬 Markedschat <UnreadBadge unread={unread} />
    </button>
    <aside aria-label="Markedschat" className={`${open ? "fixed inset-0 z-50 flex bg-background" : "hidden"} flex-col overflow-hidden lg:sticky lg:top-4 lg:z-auto lg:flex lg:h-[calc(100dvh-8rem)] lg:rounded-xl lg:border lg:border-border lg:bg-surface`}>
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div><h2 className="font-bold">Markedschat</h2><p className="text-xs text-muted">Alle managere · meldinger slettes etter 7 dager</p></div>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-1 text-sm text-muted hover:bg-surface-raised lg:hidden">Lukk</button>
      </header>
      <ul ref={listRef} onScroll={(event) => { const list = event.currentTarget; stickToBottom.current = list.scrollHeight - list.scrollTop - list.clientHeight < 40; }} className="grid flex-1 content-start gap-3 overflow-y-auto p-4">
        {messages.length ? messages.map((message) => <MessageRow key={message.id} message={message} own={message.author_id === userId} onDelete={remove} />) : <li className="m-auto py-10 text-center text-sm text-muted">Ingen har skrevet noe ennå. Start praten!</li>}
      </ul>
      {error ? <p className="px-4 text-sm text-danger">{error}</p> : null}
      <Composer onSent={() => { stickToBottom.current = true; load().catch(() => undefined); }} />
    </aside>
  </>;
}
