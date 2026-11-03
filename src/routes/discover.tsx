import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { BookCard, SkeletonCards } from "@/components/BookCard";
import { searchBooks } from "@/services/books";

const schema = z.object({
  q: z.string().optional(),
  field: z.enum(["all", "title", "author", "isbn", "genre"]).optional(),
  sort: z.enum(["relevance", "newest"]).optional(),
  page: z.number().int().min(1).optional(),
  lang: z.string().optional(),
  free: z.boolean().optional(),
  source: z.enum(["google", "openlibrary"]).optional(),
});

export const Route = createFileRoute("/discover")({
  validateSearch: schema,
  head: () => ({
    meta: [
      { title: "Discover Books — Book Nook" },
      { name: "description", content: "Search millions of books by title, author, ISBN or genre with filters and sorting." },
      { property: "og:title", content: "Discover Books — Book Nook" },
      { property: "og:description", content: "Search millions of books by title, author, ISBN or genre." },
    ],
  }),
  component: Discover,
});

const GENRES = ["fiction", "mystery", "romance", "fantasy", "science_fiction", "history", "biography", "poetry", "philosophy", "self-help", "horror", "young_adult"];
const LANGS = [["", "Any"], ["en", "English"], ["hi", "Hindi"], ["fr", "French"], ["es", "Spanish"], ["de", "German"]];
const PER = 24;

function Discover() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/discover" });
  const [text, setText] = useState(s.q ?? "");
  const [field, setField] = useState(s.field ?? "all");
  useEffect(() => { setText(s.q ?? ""); setField(s.field ?? "all"); }, [s.q, s.field]);

  const q = s.q || "subject:classics";
  const page = s.page ?? 1;
  const { data, isFetching, isError } = useQuery({
    queryKey: ["search", s],
    queryFn: () => searchBooks({ q: s.q || "classics", field: s.q ? s.field : "genre", sort: s.sort, page, perPage: PER, lang: s.lang, free: s.free, source: s.source }),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 10,
  });
  const set = (patch: Partial<z.infer<typeof schema>>) => navigate({ search: (p) => ({ ...p, page: undefined, ...patch }) });
  const submit = (e: FormEvent) => { e.preventDefault(); set({ q: text.trim() || undefined, field: field === "all" ? undefined : field }); };
  const totalPages = Math.min(40, Math.ceil((data?.total ?? 0) / PER));

  return (
    <div className="wrap page">
      <div className="eyebrow">Discover</div>
      <h1 className="page-title">{s.q ? <>Results for “{s.q.replace(/_/g, " ")}”</> : "Find your next great read"}</h1>
      <form className="big-search" onSubmit={submit}>
        <select value={field} onChange={(e) => setField(e.target.value as typeof field)} aria-label="Search by">
          <option value="all">Everything</option><option value="title">Title</option><option value="author">Author</option><option value="isbn">ISBN</option><option value="genre">Genre</option>
        </select>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Try “Pride and Prejudice”, “Murakami” or 9780141439518" aria-label="Search query" />
        <button className="btn btn-primary" type="submit"><Search size={16} /> Search</button>
      </form>

      <div className="discover-layout">
        <aside className="filters">
          <div className="filter-group">
            <h4>Genre</h4>
            <div className="chips">
              {GENRES.map((g) => (
                <button key={g} className={`chip ${s.field === "genre" && s.q === g ? "active" : ""}`} onClick={() => set({ q: g, field: "genre" })}>{g.replace(/_/g, " ")}</button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <h4>Sort by</h4>
            <div className="chips">
              {(["relevance", "newest"] as const).map((o) => (
                <button key={o} className={`chip ${(s.sort ?? "relevance") === o ? "active" : ""}`} onClick={() => set({ sort: o === "relevance" ? undefined : o })}>{o === "relevance" ? "Most relevant" : "Newest"}</button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <h4>Language</h4>
            <select className="field" value={s.lang ?? ""} onChange={(e) => set({ lang: e.target.value || undefined })}>
              {LANGS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <h4>Availability</h4>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
              <input type="checkbox" checked={!!s.free} onChange={(e) => set({ free: e.target.checked || undefined })} /> Free to read online
            </label>
          </div>
          <div className="filter-group">
            <h4>Catalogue</h4>
            <div className="chips">
              <button className={`chip ${s.source !== "openlibrary" ? "active" : ""}`} onClick={() => set({ source: undefined })}>Google Books</button>
              <button className={`chip ${s.source === "openlibrary" ? "active" : ""}`} onClick={() => set({ source: "openlibrary" })}>Open Library</button>
            </div>
          </div>
        </aside>

        <div>
          <div className="results-bar">
            <span className="muted">{data ? `${data.total.toLocaleString()} books · via ${data.source === "google" ? "Google Books" : "Open Library"}` : "Searching…"}{q && isFetching ? " · updating…" : ""}</span>
          </div>
          {isError ? (
            <div className="empty"><h3>Search is unavailable</h3><p>The book catalogues didn't respond. Please try again in a moment.</p></div>
          ) : !data ? (
            <div className="book-grid"><SkeletonCards n={12} /></div>
          ) : data.items.length === 0 ? (
            <div className="empty"><h3>No books found</h3><p>Try another spelling, a broader term, or switch catalogue.</p></div>
          ) : (
            <div className="book-grid" style={{ opacity: isFetching ? 0.6 : 1, transition: "opacity .2s" }}>
              {data.items.map((b) => <BookCard key={`${b.source}-${b.id}`} book={b} />)}
            </div>
          )}
          {totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => navigate({ search: (p) => ({ ...p, page: page - 1 }) })}><ChevronLeft size={15} /> Prev</button>
              <span className="muted">Page {page} of {totalPages}</span>
              <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => navigate({ search: (p) => ({ ...p, page: page + 1 }) })}>Next <ChevronRight size={15} /></button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
