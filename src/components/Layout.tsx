import { Link, useNavigate } from "@tanstack/react-router";
import { BookOpen, Library, Search, User } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useStore, type User as U } from "@/services/storage";

function SearchForm({ className }: { className: string }) {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (q.trim()) navigate({ to: "/discover", search: { q: q.trim() } });
  };
  return (
    <form className={className} onSubmit={submit} role="search">
      <Search size={17} className="muted" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search titles, authors, ISBN…" aria-label="Search books" />
      <button className="btn btn-primary btn-sm" type="submit">Search</button>
    </form>
  );
}

const NAV = [
  { to: "/", label: "Home" },
  { to: "/discover", label: "Discover" },
  { to: "/read-online", label: "Read Online" },
  { to: "/library", label: "My Library" },
] as const;
const GENRES = ["Fiction", "Mystery", "Romance", "Fantasy", "History", "Poetry", "Self-help"];

export function Header() {
  const [user] = useStore<U | null>("user", null);
  return (
    <>
      <div className="topbar">Discover. Read. Remember — your cozy corner for stories, free classics and reading notes.</div>
      <header className="header">
        <div className="wrap header-row">
          <Link to="/" className="logo"><BookOpen size={24} /> Book<em>Nook</em></Link>
          <SearchForm className="search-bar desktop" />
          <div className="header-icons">
            <Link to="/discover" className="btn btn-ghost btn-icon mobile-only" aria-label="Search"><Search size={20} /></Link>
            <Link to="/library" className="btn btn-ghost btn-icon" aria-label="My library"><Library size={20} /></Link>
            <Link to="/profile" className="btn btn-ghost btn-sm" aria-label="Profile"><User size={18} /> <span>{user ? user.name.split(" ")[0] : "Sign in"}</span></Link>
          </div>
        </div>
        <nav className="nav">
          <div className="wrap nav-list">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} activeOptions={{ exact: n.to === "/" }} activeProps={{ className: "active" }}>{n.label}</Link>
            ))}
            {GENRES.map((g) => (
              <Link key={g} to="/discover" search={{ q: g.toLowerCase(), field: "genre" }}>{g}</Link>
            ))}
          </div>
        </nav>
      </header>
    </>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <div className="logo"><BookOpen size={22} /> Book<em>Nook</em></div>
            <p style={{ maxWidth: 320, marginTop: 12 }}>A reader-first place to discover books and read legally free classics. We don't sell books — we help you find them.</p>
          </div>
          <div>
            <h4>Explore</h4>
            <Link to="/discover">Discover books</Link>
            <Link to="/read-online">Free library</Link>
            <Link to="/discover" search={{ q: "fiction", field: "genre", sort: "newest" }}>New arrivals</Link>
          </div>
          <div>
            <h4>You</h4>
            <Link to="/library">My library</Link>
            <Link to="/profile">Reading dashboard</Link>
          </div>
          <div>
            <h4>Sources</h4>
            <a href="https://books.google.com" target="_blank" rel="noreferrer">Google Books</a>
            <a href="https://openlibrary.org" target="_blank" rel="noreferrer">Open Library</a>
            <a href="https://www.gutenberg.org" target="_blank" rel="noreferrer">Project Gutenberg</a>
            <a href="https://archive.org" target="_blank" rel="noreferrer">Internet Archive</a>
          </div>
        </div>
        <div className="footer-bottom">© {new Date().getFullYear()} Book Nook. Book data courtesy of public APIs.</div>
      </div>
    </footer>
  );
}
