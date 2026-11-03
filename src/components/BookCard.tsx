import { Link } from "@tanstack/react-router";
import { useState } from "react";
import type { Book, FreeBook } from "@/services/books";

export function Cover({ src, title, author, badge }: { src?: string; title: string; author?: string; badge?: string }) {
  const [err, setErr] = useState(false);
  const tone = `c${(title.length % 4)}`;
  return (
    <div className="cover">
      {badge && <span className="badge">{badge}</span>}
      {src && !err ? (
        <img src={src} alt={`Cover of ${title}`} loading="lazy" onError={() => setErr(true)} />
      ) : (
        <div className={`cover-fallback ${tone}`}><strong>{title}</strong><span>{author}</span></div>
      )}
    </div>
  );
}

export function BookCard({ book }: { book: Book }) {
  return (
    <Link to="/book/$source/$id" params={{ source: book.source, id: book.id }} className="book-card fade-up">
      <Cover src={book.cover} title={book.title} author={book.authors[0]} badge={book.readable ? "Read free" : undefined} />
      <div>
        <div className="book-title">{book.title}</div>
        <div className="book-author">{book.authors.join(", ") || "Unknown author"}</div>
      </div>
    </Link>
  );
}

export function FreeBookCard({ book }: { book: FreeBook }) {
  return (
    <Link to="/read/$source/$id" params={{ source: book.source, id: book.id }} className="book-card fade-up">
      <Cover src={book.cover} title={book.title} author={book.authors[0]} badge={book.source === "gutenberg" ? "Gutenberg" : "Archive"} />
      <div>
        <div className="book-title">{book.title}</div>
        <div className="book-author">{book.authors.join(", ") || "Unknown author"}</div>
      </div>
    </Link>
  );
}

export function SkeletonCards({ n = 8 }: { n?: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="book-card">
          <div className="skeleton" style={{ aspectRatio: "2/3" }} />
          <div className="skeleton" style={{ height: 14, width: "80%" }} />
          <div className="skeleton" style={{ height: 10, width: "50%" }} />
        </div>
      ))}
    </>
  );
}
