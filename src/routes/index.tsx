import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpenText, Compass, Feather, Sparkles } from "lucide-react";
import { useState } from "react";
import hero from "@/assets/hero-nook.jpg";
import { BookRow, SeeAll } from "@/components/BookRow";
import { Cover } from "@/components/BookCard";
import { searchBooks, subjectBooks, trendingBooks } from "@/services/books";
import { EMPTY_OBJ, useStore, type Progress, type ShelfItem } from "@/services/storage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Book Nook — Discover books & read free classics" },
      { name: "description", content: "A cozy, editorial place to discover trending books, explore genres and read free classics online." },
      { property: "og:title", content: "Book Nook — Discover books & read free classics" },
      { property: "og:description", content: "Trending books, genres, moods and a free digital library in one reader-first nook." },
    ],
  }),
  component: Home,
});

const GENRES = [
  ["Literary Fiction", "fiction"], ["Mystery & Thriller", "mystery"], ["Romance", "romance"], ["Fantasy", "fantasy"],
  ["Science Fiction", "science_fiction"], ["History", "history"], ["Biography", "biography"], ["Poetry", "poetry"],
  ["Self-help", "self-help"], ["Philosophy", "philosophy"], ["Children", "children"], ["Business", "business"],
] as const;

const MOODS = [
  { t: "Rainy-day reads", d: "Slow, atmospheric, soul-warming", q: "cozy" },
  { t: "Heart racing", d: "Thrillers you can't put down", q: "thriller" },
  { t: "Need a good cry", d: "Tender, aching stories", q: "grief" },
  { t: "Feel brand new", d: "Ideas that change you", q: "personal growth" },
];

const AUTHORS = [
  ["Jane Austen", "OL21594A"], ["Agatha Christie", "OL27695A"], ["J.R.R. Tolkien", "OL26320A"], ["J.K. Rowling", "OL23919A"],
  ["Leo Tolstoy", "OL26783A"], ["Toni Morrison", "OL31574A"], ["Haruki Murakami", "OL1427729A"],
];

function AuthorAvatar({ name, olid }: { name: string; olid: string }) {
  const [err, setErr] = useState(false);
  return (
    <div className="author-avatar">
      {err ? name.split(" ").map((p) => p[0]).slice(0, 2).join("") : (
        <img src={`https://covers.openlibrary.org/a/olid/${olid}-M.jpg?default=false`} alt={name} loading="lazy" onError={() => setErr(true)} />
      )}
    </div>
  );
}

function Home() {
  const [progress] = useStore<Record<string, Progress>>("progress", EMPTY_OBJ);
  const [shelf] = useStore<ShelfItem[]>("shelf", []);
  const reading = Object.values(progress).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6);
  const seed = shelf[0]?.authors[0];

  return (
    <div className="wrap">
      <section className="hero fade-up">
        <img className="bg" src={hero} alt="Stacked books and an open novel by a sunlit window" width={1600} height={912} />
        <div className="hero-content">
          <div className="eyebrow">The reader's corner</div>
          <h1>Find the book that <em>finds you.</em></h1>
          <p>Browse millions of titles, wander through moods and genres, and read timeless classics free — right here.</p>
          <div className="hero-actions">
            <Link to="/discover" className="btn btn-light"><Compass size={17} /> Start discovering</Link>
            <Link to="/read-online" className="btn btn-outline" style={{ borderColor: "var(--cream)", color: "var(--cream)" }}><BookOpenText size={17} /> Read free</Link>
          </div>
        </div>
      </section>

      <div className="promo-grid">
        <Link to="/read-online" className="promo promo-olive"><span className="eyebrow" style={{ color: "var(--olive-soft)" }}>Digital library</span><h3>70,000+ free classics <ArrowRight size={18} /></h3></Link>
        <Link to="/discover" search={{ q: "fiction", field: "genre", sort: "newest" }} className="promo promo-rose"><span className="eyebrow">Just in</span><h3>New arrivals this season</h3></Link>
        <Link to="/library" className="promo promo-sand"><span className="eyebrow">Your shelf</span><h3>Wishlist, notes & progress</h3></Link>
      </div>

      {reading.length > 0 && (
        <section className="section">
          <div className="section-head"><div><div className="eyebrow">Pick up where you left off</div><h2>Continue reading</h2></div></div>
          <div className="row-scroll">
            {reading.map((p) => (
              <Link key={p.key} to="/read/$source/$id" params={{ source: p.source, id: p.id }} className="book-card">
                <Cover src={p.cover} title={p.title} author={p.authors[0]} />
                <div className="book-title">{p.title}</div>
                <div className="progress"><div style={{ width: `${Math.round(((p.page + 1) / p.total) * 100)}%` }} /></div>
                <div className="book-author">Page {p.page + 1} of {p.total}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <BookRow eyebrow="What everyone's reading" title="Trending this week" queryKey={["trending"]} fetcher={() => trendingBooks("weekly", 18)} more={<Link to="/discover">Explore <ArrowRight size={14} /></Link>} />
      <BookRow eyebrow="Loved by millions" title="Bestsellers" queryKey={["bestsellers"]} fetcher={() => subjectBooks("bestsellers", 18)} more={<SeeAll q="bestsellers" field="genre" />} />
      <BookRow eyebrow="Fresh off the press" title="New arrivals" queryKey={["new"]} fetcher={() => searchBooks({ q: "fiction", field: "genre", sort: "newest", perPage: 18 }).then((r) => r.items.filter((b) => b.cover))} more={<SeeAll q="fiction" field="genre" sort="newest" />} />

      <section className="section">
        <div className="section-head"><div><div className="eyebrow">Browse the shelves</div><h2>Shop by genre — minus the shop</h2></div></div>
        <div className="genre-grid">
          {GENRES.map(([label, q]) => (
            <Link key={q} to="/discover" search={{ q, field: "genre" }} className="genre"><Feather size={18} color="var(--rose)" /><strong>{label}</strong></Link>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head"><div><div className="eyebrow">Read by feeling</div><h2>Mood collections</h2></div></div>
        <div className="mood-grid">
          {MOODS.map((m) => (
            <Link key={m.t} to="/discover" search={{ q: m.q }} className="mood"><Sparkles size={18} /><h3>{m.t}</h3><span>{m.d}</span></Link>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head"><div><div className="eyebrow">Voices worth knowing</div><h2>Featured authors</h2></div></div>
        <div className="author-row">
          {AUTHORS.map(([name, olid]) => (
            <Link key={name} to="/discover" search={{ q: name, field: "author" }} className="author"><AuthorAvatar name={name} olid={olid} /><strong>{name}</strong></Link>
          ))}
        </div>
      </section>

      <BookRow
        eyebrow={seed ? `Because you saved ${seed}` : "Curated for you"}
        title="Recommended for you"
        queryKey={["recs", seed ?? "classics"]}
        fetcher={() => (seed ? searchBooks({ q: seed, field: "author", perPage: 18 }).then((r) => r.items) : subjectBooks("classic_literature", 18))}
      />

      <section className="section quote-band">
        <blockquote>“A reader lives a thousand lives before he dies. The man who never reads lives only one.”</blockquote>
        <span style={{ color: "var(--sand)" }}>— George R.R. Martin</span>
        <div style={{ marginTop: 24 }}><Link to="/read-online" className="btn btn-light">Open the free library</Link></div>
      </section>
    </div>
  );
}
