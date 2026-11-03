import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { FreeBookCard, SkeletonCards } from "@/components/BookCard";
import { archiveBooks, gutenbergBooks } from "@/services/books";

export const Route = createFileRoute("/read-online")({
  validateSearch: z.object({
    q: z.string().optional(),
    topic: z.string().optional(),
    lib: z.enum(["gutenberg", "archive"]).optional(),
    page: z.number().int().min(1).optional(),
  }),
  head: () => ({
    meta: [
      { title: "Read Online — Free Digital Library | Book Nook" },
      { name: "description", content: "Read legally free books from Project Gutenberg and the Internet Archive in a beautiful reader." },
      { property: "og:title", content: "Read Online — Free Digital Library | Book Nook" },
      { property: "og:description", content: "Thousands of free classics with themes, notes and saved progress." },
    ],
  }),
  component: ReadOnline,
});

const TOPICS = ["fiction", "adventure", "romance", "mystery", "poetry", "philosophy", "history", "children", "science fiction", "gothic"];

function ReadOnline() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/read-online" });
  const lib = s.lib ?? "gutenberg";
  const page = s.page ?? 1;
  const [text, setText] = useState(s.q ?? "");
  useEffect(() => setText(s.q ?? ""), [s.q]);

  const { data, isError, isFetching } = useQuery({
    queryKey: ["free", lib, s.q, s.topic, page],
    queryFn: async () => {
      if (lib === "archive") { const r = await archiveBooks({ search: s.q, page }); return { ...r, hasNext: page * 24 < r.total }; }
      return gutenbergBooks({ search: s.q, topic: s.topic, page });
    },
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 30,
  });

  const submit = (e: FormEvent) => { e.preventDefault(); navigate({ search: (p) => ({ ...p, q: text.trim() || undefined, page: undefined }) }); };

  return (
    <div className="wrap page">
      <div className="eyebrow">Digital library</div>
      <h1 className="page-title">Read online, free forever</h1>
      <p className="muted" style={{ maxWidth: 620, marginBottom: 24 }}>Public-domain and openly licensed books from Project Gutenberg and the Internet Archive. Your page, notes and highlights are saved automatically.</p>

      <div className="tabs">
        <button className={`tab ${lib === "gutenberg" ? "active" : ""}`} onClick={() => navigate({ search: { lib: undefined, q: s.q } })}>Project Gutenberg</button>
        <button className={`tab ${lib === "archive" ? "active" : ""}`} onClick={() => navigate({ search: { lib: "archive", q: s.q } })}>Internet Archive</button>
      </div>

      <form className="big-search" onSubmit={submit} style={{ marginBottom: 18 }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search free books by title or author" aria-label="Search free books" />
        <button className="btn btn-primary"><Search size={16} /> Search</button>
      </form>
      {lib === "gutenberg" && (
        <div className="chips" style={{ marginBottom: 28 }}>
          <button className={`chip ${!s.topic ? "active" : ""}`} onClick={() => navigate({ search: (p) => ({ ...p, topic: undefined, page: undefined }) })}>Most popular</button>
          {TOPICS.map((t) => <button key={t} className={`chip ${s.topic === t ? "active" : ""}`} onClick={() => navigate({ search: (p) => ({ ...p, topic: t, page: undefined }) })}>{t}</button>)}
        </div>
      )}

      {isError ? (
        <div className="empty"><h3>The library is resting</h3><p>We couldn't reach the free library. Please try again shortly.</p></div>
      ) : !data ? (
        <div className="book-grid"><SkeletonCards n={12} /></div>
      ) : data.items.length === 0 ? (
        <div className="empty"><h3>Nothing on this shelf</h3><p>Try a different search.</p></div>
      ) : (
        <div className="book-grid" style={{ opacity: isFetching ? 0.6 : 1 }}>{data.items.map((b) => <FreeBookCard key={b.id} book={b} />)}</div>
      )}

      {data && (page > 1 || data.hasNext) && (
        <div className="pagination">
          <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => navigate({ search: (p) => ({ ...p, page: page - 1 }) })}><ChevronLeft size={15} /> Prev</button>
          <span className="muted">Page {page}</span>
          <button className="btn btn-outline btn-sm" disabled={!data.hasNext} onClick={() => navigate({ search: (p) => ({ ...p, page: page + 1 }) })}>Next <ChevronRight size={15} /></button>
        </div>
      )}
    </div>
  );
}
