import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpenText, Check, ExternalLink, Heart, ShoppingBag, Star } from "lucide-react";
import { BookRow } from "@/components/BookRow";
import { Cover } from "@/components/BookCard";
import { getBook, gutenbergBooks, purchaseLinks, searchBooks, subjectBooks, type Source } from "@/services/books";
import { useShelf } from "@/services/library";

export const Route = createFileRoute("/book/$source/$id")({
  head: () => ({
    meta: [
      { title: "Book details — Book Nook" },
      { name: "description", content: "Description, author, publisher, ISBN, related books and where to read." },
      { property: "og:title", content: "Book details — Book Nook" },
      { property: "og:description", content: "Everything about this book, plus where to read it." },
    ],
  }),
  component: BookPage,
});

function stripHtml(s: string) {
  return s.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n").replace(/<[^>]+>/g, "").trim();
}

function BookPage() {
  const { source, id } = Route.useParams();
  const src = (source === "openlibrary" ? "openlibrary" : "google") as Source;
  const { data: book, isLoading, isError } = useQuery({ queryKey: ["book", src, id], queryFn: () => getBook(src, id) });
  const { data: free } = useQuery({
    queryKey: ["gut-match", book?.title],
    enabled: !!book,
    queryFn: () => gutenbergBooks({ search: `${book!.title} ${book!.authors[0]?.split(" ").pop() ?? ""}` }).then((r) => r.items[0]),
    staleTime: Infinity,
  });
  const shelf = useShelf();
  const key = `${src}:${id}`;
  const current = shelf.get(key);

  if (isLoading) return <div className="wrap page"><div className="detail"><div className="skeleton" style={{ aspectRatio: "2/3" }} /><div><div className="skeleton" style={{ height: 40, width: "70%" }} /><div className="skeleton" style={{ height: 200, marginTop: 20 }} /></div></div></div>;
  if (isError || !book) return <div className="wrap page"><div className="empty"><h3>We couldn't open this book</h3><p>It may have been removed from the catalogue.</p><Link to="/discover" className="btn btn-primary" style={{ marginTop: 16 }}>Back to discover</Link></div></div>;

  const links = purchaseLinks(book);
  const base = { key, id, source: src, title: book.title, authors: book.authors, cover: book.cover };
  const desc = book.description ? stripHtml(book.description) : "";

  return (
    <div className="wrap page">
      <div className="detail fade-up">
        <div><Cover src={book.cover} title={book.title} author={book.authors[0]} /></div>
        <div>
          <div className="eyebrow">{book.categories?.[0] ?? "Book"}</div>
          <h1>{book.title}</h1>
          <p style={{ fontSize: 17 }}>
            by{" "}
            {book.authors.length ? book.authors.map((a, i) => (
              <span key={a}>{i > 0 && ", "}<Link to="/discover" search={{ q: a, field: "author" }} style={{ color: "var(--olive)", fontWeight: 600 }}>{a}</Link></span>
            )) : "Unknown author"}
          </p>
          {book.rating && <p className="muted" style={{ display: "flex", gap: 6, alignItems: "center" }}><Star size={15} fill="var(--rose)" color="var(--rose)" /> {book.rating} average rating</p>}

          <div className="actions">
            <button className={`btn ${current?.shelf === "wishlist" ? "btn-olive" : "btn-outline"}`} onClick={() => current?.shelf === "wishlist" ? shelf.remove(key) : shelf.put(base, "wishlist")}>
              <Heart size={16} fill={current?.shelf === "wishlist" ? "currentColor" : "none"} /> {current?.shelf === "wishlist" ? "On wishlist" : "Add to wishlist"}
            </button>
            <button className={`btn ${current?.shelf === "reading" ? "btn-olive" : "btn-outline"}`} onClick={() => shelf.put(base, "reading")}><BookOpenText size={16} /> Currently reading</button>
            <button className={`btn ${current?.shelf === "completed" ? "btn-olive" : "btn-outline"}`} onClick={() => shelf.put(base, "completed")}><Check size={16} /> Finished</button>
          </div>

          <dl className="detail-meta">
            <div><dt>Publisher</dt><dd>{book.publisher ?? "—"}</dd></div>
            <div><dt>Published</dt><dd>{book.publishedDate ?? "—"}</dd></div>
            <div><dt>ISBN</dt><dd>{book.isbn ?? "—"}</dd></div>
            <div><dt>Pages</dt><dd>{book.pageCount ?? "—"}</dd></div>
            {book.language && <div><dt>Language</dt><dd>{book.language.toUpperCase()}</dd></div>}
          </dl>

          <div className="description">
            {desc ? desc.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>) : <p className="muted">No description available for this edition.</p>}
          </div>

          <div className="availability">
            <h3 style={{ fontSize: 20 }}>Reading availability</h3>
            <div className="actions" style={{ marginTop: 0 }}>
              {free && <Link to="/read/$source/$id" params={{ source: "gutenberg", id: free.id }} className="btn btn-primary"><BookOpenText size={16} /> Read free in Book Nook</Link>}
              {book.iaId && <Link to="/read/$source/$id" params={{ source: "archive", id: book.iaId }} className="btn btn-primary"><BookOpenText size={16} /> Read on Internet Archive</Link>}
              {book.previewLink && <a href={book.previewLink} target="_blank" rel="noreferrer" className="btn btn-outline"><ExternalLink size={16} /> {book.readable ? "Preview on Google Books" : "View on Google Books"}</a>}
              {!free && !book.iaId && !book.previewLink && <span className="muted">No free online edition found.</span>}
            </div>
            <div className="muted" style={{ fontSize: 13 }}>Want your own copy? Search other stores:</div>
            <div className="actions" style={{ marginTop: 0 }}>
              <a href={links.amazon} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm"><ShoppingBag size={15} /> Amazon</a>
              <a href={links.flipkart} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm"><ShoppingBag size={15} /> Flipkart</a>
            </div>
          </div>
        </div>
      </div>

      {book.authors[0] && <BookRow eyebrow="Same author" title={`More by ${book.authors[0]}`} queryKey={["by", book.authors[0]]} fetcher={() => searchBooks({ q: book.authors[0], field: "author", perPage: 16 }).then((r) => r.items.filter((b) => b.id !== id))} />}
      {book.categories?.[0] && <BookRow eyebrow="You may also like" title="Related books" queryKey={["related", book.categories[0]]} fetcher={() => subjectBooks(book.categories![0].toLowerCase().split(/[/,]/)[0].trim().replace(/\s+/g, "_"), 16)} />}
    </div>
  );
}
