import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  ArrowLeft, Bookmark as BookmarkIcon, ChevronLeft, ChevronRight, Highlighter, List, Maximize, Minus, NotebookPen, Plus, Search, Settings2, StickyNote, Trash2, X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { fetchGutenbergText } from "@/services/gutenberg.functions";
import { EMPTY, EMPTY_OBJ, useStore, type Bookmark, type Highlight, type HistoryEntry, type Note, type Progress } from "@/services/storage";

export const Route = createFileRoute("/read/$source/$id")({
  head: () => ({
    meta: [
      { title: "Reading — Book Nook" },
      { name: "description", content: "Read with themes, highlights, notes and automatically saved progress." },
      { property: "og:title", content: "Reading — Book Nook" },
      { property: "og:description", content: "A calm, focused online reader." },
    ],
  }),
  component: Reader,
});

interface Meta { title: string; authors: string[]; cover?: string }

async function loadMeta(source: string, id: string): Promise<Meta> {
  if (source === "gutenberg") {
    const b = await fetch(`https://gutendex.com/books/${id}`).then((r) => r.json());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { title: b.title, authors: (b.authors ?? []).map((a: any) => a.name.split(", ").reverse().join(" ")), cover: b.formats?.["image/jpeg"] };
  }
  const m = await fetch(`https://archive.org/metadata/${id}`).then((r) => r.json());
  return { title: m.metadata?.title ?? id, authors: m.metadata?.creator ? [].concat(m.metadata.creator) : [], cover: `https://archive.org/services/img/${id}` };
}

type Para = { text: string; heading: boolean };
const HEADING = /^(chapter|book|part|volume|act|letter|stave|canto)\b[\s\w.:'-]{0,60}$|^[IVXLC]+\.?$/i;

function paginate(raw: string, size: number): Para[][] {
  const paras = raw.replace(/\r/g, "").split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean)
    .map((t) => ({ text: t, heading: t.length < 70 && HEADING.test(t) }));
  const pages: Para[][] = [];
  let cur: Para[] = [], len = 0;
  for (const p of paras) {
    if ((len + p.text.length > size && cur.length) || (p.heading && len > size * 0.35)) { pages.push(cur); cur = []; len = 0; }
    cur.push(p); len += p.text.length;
  }
  if (cur.length) pages.push(cur);
  return pages;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function mark(text: string, highlights: string[], term: string): ReactNode {
  const parts = [...highlights.map(esc), term.length > 1 ? esc(term) : ""].filter(Boolean);
  if (!parts.length) return text;
  const re = new RegExp(`(${parts.join("|")})`, "gi");
  return text.split(re).map((chunk, i) => {
    if (i % 2 === 0) return chunk;
    const isHit = term.length > 1 && chunk.toLowerCase() === term.toLowerCase();
    return <mark key={i} className={isHit ? "hit" : ""}>{chunk}</mark>;
  });
}

type Panel = null | "chapters" | "search" | "notes" | "settings";
const uid = () => Math.random().toString(36).slice(2, 10);

function Reader() {
  const { source, id } = Route.useParams();
  const router = useRouter();
  const key = `${source}:${id}`;
  const meta = useQuery({ queryKey: ["meta", source, id], queryFn: () => loadMeta(source, id), staleTime: Infinity });
  const text = useQuery({ queryKey: ["text", id], queryFn: () => fetchGutenbergText({ data: { id } }), enabled: source === "gutenberg", staleTime: Infinity, retry: 1 });

  const [prefs, setPrefs] = useStore("reader-prefs", { theme: "sepia", size: 19, font: "serif", line: 1.75 });
  const [progressAll, setProgressAll] = useStore<Record<string, Progress>>("progress", EMPTY_OBJ);
  const [bookmarks, setBookmarks] = useStore<Bookmark[]>("bookmarks", EMPTY);
  const [notes, setNotes] = useStore<Note[]>("notes", EMPTY);
  const [highlights, setHighlights] = useStore<Highlight[]>("highlights", EMPTY);
  const [, setHistory] = useStore<HistoryEntry[]>("history", EMPTY);

  const pageSize = Math.round(3400 * Math.pow(18 / prefs.size, 2));
  const pages = useMemo(() => (text.data ? paginate(text.data.text, pageSize) : []), [text.data, pageSize]);
  const saved = progressAll[key];
  const [page, setPage] = useState<number | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [term, setTerm] = useState("");
  const [sel, setSel] = useState<{ x: number; y: number; text: string } | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const restored = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Restore exact position once pages are ready
  useEffect(() => {
    if (!pages.length || restored.current) return;
    restored.current = true;
    const p = saved ? Math.min(Math.round((saved.page / Math.max(1, saved.total)) * pages.length), pages.length - 1) : 0;
    setPage(saved && saved.total === pages.length ? saved.page : p);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const el = scroller.current;
      if (el && saved) el.scrollTop = saved.scroll * (el.scrollHeight - el.clientHeight);
    }));
  }, [pages.length, saved]);

  // Record history once
  useEffect(() => {
    if (!meta.data) return;
    setHistory((h) => [{ key, title: meta.data.title, source, id, at: Date.now() }, ...h.filter((x) => x.key !== key)].slice(0, 50));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta.data, key]);

  const save = useCallback((pg: number) => {
    if (!meta.data || !pages.length) return;
    const el = scroller.current;
    const scroll = el && el.scrollHeight > el.clientHeight ? el.scrollTop / (el.scrollHeight - el.clientHeight) : 0;
    setProgressAll((all) => ({ ...all, [key]: { key, source, id, title: meta.data!.title, authors: meta.data!.authors, cover: meta.data!.cover, page: pg, total: pages.length, scroll, updatedAt: Date.now() } }));
  }, [meta.data, pages.length, key, source, id, setProgressAll]);

  const go = useCallback((n: number) => {
    if (!pages.length) return;
    const next = Math.max(0, Math.min(pages.length - 1, n));
    setPage(next);
    if (scroller.current) scroller.current.scrollTop = 0;
    setTimeout(() => save(next), 0);
  }, [pages.length, save]);

  useEffect(() => { if (page !== null) save(page); }, [page, save]);

  // Save scroll position (debounced)
  useEffect(() => {
    const el = scroller.current;
    if (!el || page === null) return;
    let t: ReturnType<typeof setTimeout>;
    const on = () => { clearTimeout(t); t = setTimeout(() => save(page), 400); };
    el.addEventListener("scroll", on);
    return () => { el.removeEventListener("scroll", on); clearTimeout(t); };
  }, [page, save]);

  const toggleFull = () => (document.fullscreenElement ? document.exitFullscreen() : rootRef.current?.requestFullscreen());
  const cur = page ?? 0;
  const isBookmarked = bookmarks.some((b) => b.bookKey === key && b.page === cur);
  const toggleBookmark = () => setBookmarks((bs) => isBookmarked ? bs.filter((b) => !(b.bookKey === key && b.page === cur)) : [{ id: uid(), bookKey: key, title: meta.data?.title ?? "", page: cur, createdAt: Date.now() }, ...bs]);
  const zoom = (d: number) => setPrefs((p) => ({ ...p, size: Math.max(14, Math.min(28, p.size + d)) }));

  // Keyboard shortcuts
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea,select")) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") go(cur + 1);
      else if (e.key === "ArrowLeft" || e.key === "PageUp") go(cur - 1);
      else if (e.key === "f") toggleFull();
      else if (e.key === "+" || e.key === "=") zoom(1);
      else if (e.key === "-") zoom(-1);
      else if (e.key === "b") toggleBookmark();
      else if (e.key === "/") { e.preventDefault(); setPanel("search"); }
      else if (e.key === "Escape") { setPanel(null); setSel(null); }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  });

  const onMouseUp = () => {
    const s = window.getSelection();
    const t = s?.toString().trim();
    if (!s || !t || t.length < 3) return setSel(null);
    const r = s.getRangeAt(0).getBoundingClientRect();
    setSel({ x: r.left + r.width / 2 - 90, y: Math.max(8, r.top - 48), text: t.slice(0, 500) });
  };

  const chapters = useMemo(() => pages.flatMap((pg, i) => pg.filter((p) => p.heading).map((p) => ({ title: p.text, page: i }))), [pages]);
  const results = useMemo(() => {
    if (term.length < 3) return [];
    const t = term.toLowerCase();
    const out: { page: number; snippet: string }[] = [];
    pages.forEach((pg, i) => pg.forEach((p) => {
      const at = p.text.toLowerCase().indexOf(t);
      if (at >= 0 && out.length < 100) out.push({ page: i, snippet: "…" + p.text.slice(Math.max(0, at - 40), at + 60) + "…" });
    }));
    return out;
  }, [term, pages]);
  const pageHighlights = highlights.filter((h) => h.bookKey === key && h.page === cur).map((h) => h.text);
  const bookNotes = notes.filter((n) => n.bookKey === key);
  const bookBookmarks = bookmarks.filter((b) => b.bookKey === key);
  const fontFamily = prefs.font === "serif" ? "var(--font-display)" : prefs.font === "mono" ? "ui-monospace, monospace" : "var(--font-body)";

  const PanelBtn = ({ p, icon, label }: { p: Panel; icon: ReactNode; label: string }) => (
    <button className={`btn btn-sm btn-icon ${panel === p ? "active" : ""}`} onClick={() => setPanel(panel === p ? null : p)} aria-label={label} title={label}>{icon}</button>
  );

  return (
    <div className="reader" data-theme={prefs.theme} ref={rootRef}>
      <div className="reader-bar">
        <button className="btn btn-sm btn-icon" onClick={() => (window.history.length > 1 ? router.history.back() : router.navigate({ to: "/read-online" }))} aria-label="Back"><ArrowLeft size={18} /></button>
        <div className="title">{meta.data?.title ?? "Loading…"}{meta.data?.authors[0] && <span style={{ opacity: 0.6, fontFamily: "var(--font-body)", fontWeight: 400 }}> · {meta.data.authors[0]}</span>}</div>
        {source === "gutenberg" && (
          <>
            <PanelBtn p="chapters" icon={<List size={18} />} label="Chapters & bookmarks" />
            <PanelBtn p="search" icon={<Search size={18} />} label="Search in book (/)" />
            <PanelBtn p="notes" icon={<NotebookPen size={18} />} label="Notes & highlights" />
            <button className="btn btn-sm btn-icon" onClick={() => zoom(-1)} aria-label="Zoom out (-)"><Minus size={18} /></button>
            <button className="btn btn-sm btn-icon" onClick={() => zoom(1)} aria-label="Zoom in (+)"><Plus size={18} /></button>
            <button className={`btn btn-sm btn-icon ${isBookmarked ? "active" : ""}`} onClick={toggleBookmark} aria-label="Bookmark page (b)"><BookmarkIcon size={18} /></button>
            <PanelBtn p="settings" icon={<Settings2 size={18} />} label="Reading settings" />
          </>
        )}
        <button className="btn btn-sm btn-icon" onClick={toggleFull} aria-label="Fullscreen (f)"><Maximize size={18} /></button>
      </div>

      <div className="reader-body">
        {source === "archive" ? (
          <iframe className="reader-frame" src={`https://archive.org/embed/${id}`} title={meta.data?.title ?? "Book"} allowFullScreen />
        ) : text.isError ? (
          <div className="reader-page"><div className="reader-text" style={{ textAlign: "center" }}><h2>This book couldn't be opened</h2><p>Its text isn't available right now. <Link to="/read-online" style={{ textDecoration: "underline" }}>Choose another book</Link>.</p></div></div>
        ) : !pages.length ? (
          <div className="reader-page"><div className="reader-text">{Array.from({ length: 10 }, (_, i) => <div key={i} className="skeleton" style={{ height: 14, margin: "14px 0", opacity: 0.5 }} />)}</div></div>
        ) : (
          <div className="reader-page" ref={scroller} onMouseUp={onMouseUp}>
            <article className="reader-text" style={{ fontSize: prefs.size, lineHeight: prefs.line, fontFamily }}>
              {pages[cur]?.map((p, i) => <p key={i} className={p.heading ? "heading" : ""}>{mark(p.text, pageHighlights, term)}</p>)}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 40, fontFamily: "var(--font-body)", fontSize: 14 }}>
                <button className="btn btn-sm" style={{ color: "inherit" }} disabled={cur === 0} onClick={() => go(cur - 1)}><ChevronLeft size={16} /> Previous</button>
                <button className="btn btn-sm" style={{ color: "inherit" }} disabled={cur >= pages.length - 1} onClick={() => go(cur + 1)}>Next <ChevronRight size={16} /></button>
              </div>
            </article>
          </div>
        )}

        {panel && source === "gutenberg" && (
          <aside className="reader-side">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4>{{ chapters: "Contents", search: "Search", notes: "Notes & highlights", settings: "Reading settings" }[panel]}</h4>
              <button className="btn btn-sm btn-icon" style={{ color: "inherit" }} onClick={() => setPanel(null)} aria-label="Close"><X size={16} /></button>
            </div>

            {panel === "chapters" && (
              <>
                {bookBookmarks.length > 0 && <h4>Bookmarks</h4>}
                {bookBookmarks.map((b) => <button key={b.id} className="item" onClick={() => go(b.page)}><BookmarkIcon size={12} /> Page {b.page + 1}</button>)}
                <h4>Chapters</h4>
                {chapters.length ? chapters.map((c, i) => <button key={i} className="item" onClick={() => go(c.page)} style={{ fontWeight: c.page === cur ? 700 : 400 }}>{c.title}<span style={{ float: "right", opacity: 0.6 }}>{c.page + 1}</span></button>) : <p style={{ fontSize: 13, opacity: 0.7 }}>No chapter markers detected — use the page slider below.</p>}
              </>
            )}

            {panel === "search" && (
              <>
                <input autoFocus className="field" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Find words in this book…" />
                <p style={{ fontSize: 12, opacity: 0.7 }}>{term.length >= 3 ? `${results.length}${results.length === 100 ? "+" : ""} matches` : "Type at least 3 letters"}</p>
                {results.map((r, i) => <button key={i} className="item" onClick={() => go(r.page)}><strong>p. {r.page + 1}</strong> {r.snippet}</button>)}
              </>
            )}

            {panel === "notes" && (
              <>
                <textarea className="field" rows={3} value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder={`Write a note for page ${cur + 1}…`} />
                <button className="btn btn-olive btn-sm" disabled={!noteDraft.trim()} onClick={() => { setNotes((n) => [{ id: uid(), bookKey: key, title: meta.data?.title ?? "", page: cur, text: noteDraft.trim(), createdAt: Date.now() }, ...n]); setNoteDraft(""); }}><StickyNote size={14} /> Save note</button>
                {bookNotes.map((n) => (
                  <div key={n.id} className="item">
                    <button style={{ background: "none", border: 0, color: "inherit", padding: 0, textAlign: "left" }} onClick={() => go(n.page)}>
                      {n.quote && <em style={{ display: "block", opacity: 0.75, marginBottom: 4 }}>“{n.quote}”</em>}{n.text} <span style={{ opacity: 0.6 }}>· p. {n.page + 1}</span>
                    </button>
                    <button className="btn btn-sm btn-icon" style={{ color: "inherit", float: "right" }} onClick={() => setNotes((ns) => ns.filter((x) => x.id !== n.id))} aria-label="Delete note"><Trash2 size={13} /></button>
                  </div>
                ))}
                <h4>Highlights</h4>
                {highlights.filter((h) => h.bookKey === key).map((h) => (
                  <div key={h.id} className="item">
                    <button style={{ background: "none", border: 0, color: "inherit", padding: 0, textAlign: "left" }} onClick={() => go(h.page)}><mark>{h.text.slice(0, 140)}</mark> <span style={{ opacity: 0.6 }}>· p. {h.page + 1}</span></button>
                    <button className="btn btn-sm btn-icon" style={{ color: "inherit", float: "right" }} onClick={() => setHighlights((hs) => hs.filter((x) => x.id !== h.id))} aria-label="Remove highlight"><Trash2 size={13} /></button>
                  </div>
                ))}
                <p style={{ fontSize: 12, opacity: 0.7 }}>Tip: select any text on the page to highlight it or attach a note.</p>
              </>
            )}

            {panel === "settings" && (
              <>
                <h4>Theme</h4>
                <div className="chips">{["light", "sepia", "dark"].map((t) => <button key={t} className={`chip ${prefs.theme === t ? "active" : ""}`} onClick={() => setPrefs((p) => ({ ...p, theme: t }))}>{t}</button>)}</div>
                <h4>Font</h4>
                <div className="chips">{[["serif", "Serif"], ["sans", "Sans"], ["mono", "Mono"]].map(([v, l]) => <button key={v} className={`chip ${prefs.font === v ? "active" : ""}`} onClick={() => setPrefs((p) => ({ ...p, font: v }))}>{l}</button>)}</div>
                <h4>Text size · {prefs.size}px</h4>
                <input type="range" min={14} max={28} value={prefs.size} onChange={(e) => setPrefs((p) => ({ ...p, size: +e.target.value }))} />
                <h4>Line spacing · {prefs.line}</h4>
                <input type="range" min={1.3} max={2.2} step={0.05} value={prefs.line} onChange={(e) => setPrefs((p) => ({ ...p, line: +e.target.value }))} />
                <h4>Keyboard shortcuts</h4>
                <div style={{ fontSize: 13, display: "grid", gap: 6 }}>
                  <span><span className="kbd">←</span> <span className="kbd">→</span> turn pages</span>
                  <span><span className="kbd">+</span> <span className="kbd">−</span> zoom</span>
                  <span><span className="kbd">b</span> bookmark · <span className="kbd">f</span> fullscreen</span>
                  <span><span className="kbd">/</span> search · <span className="kbd">Esc</span> close</span>
                </div>
              </>
            )}
          </aside>
        )}
      </div>

      {source === "gutenberg" && pages.length > 0 && (
        <div className="reader-foot">
          <button className="btn btn-sm btn-icon" style={{ color: "inherit" }} onClick={() => go(cur - 1)} disabled={cur === 0} aria-label="Previous page"><ChevronLeft size={18} /></button>
          <input type="range" min={0} max={pages.length - 1} value={cur} onChange={(e) => go(+e.target.value)} aria-label="Page" />
          <button className="btn btn-sm btn-icon" style={{ color: "inherit" }} onClick={() => go(cur + 1)} disabled={cur >= pages.length - 1} aria-label="Next page"><ChevronRight size={18} /></button>
          <span style={{ whiteSpace: "nowrap" }}>{cur + 1} / {pages.length} · {Math.round(((cur + 1) / pages.length) * 100)}%</span>
        </div>
      )}

      {sel && (
        <div className="sel-pop" style={{ left: sel.x, top: sel.y }} onMouseDown={(e) => e.preventDefault()}>
          <button onClick={() => { setHighlights((h) => [...h, { id: uid(), bookKey: key, page: cur, text: sel.text }]); setSel(null); window.getSelection()?.removeAllRanges(); }}><Highlighter size={14} /> Highlight</button>
          <button onClick={() => { const t = window.prompt("Your note"); if (t) setNotes((n) => [{ id: uid(), bookKey: key, title: meta.data?.title ?? "", page: cur, quote: sel.text, text: t, createdAt: Date.now() }, ...n]); setSel(null); }}><StickyNote size={14} /> Note</button>
        </div>
      )}
    </div>
  );
}
