import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import type { Book } from "@/services/books";
import { BookCard, SkeletonCards } from "./BookCard";

export function BookRow({ title, eyebrow, queryKey, fetcher, more }: {
  title: string; eyebrow?: string; queryKey: unknown[]; fetcher: () => Promise<Book[]>; more?: ReactNode;
}) {
  const { data, isLoading, isError } = useQuery({ queryKey, queryFn: fetcher, staleTime: 1000 * 60 * 30 });
  return (
    <section className="section">
      <div className="section-head">
        <div>
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h2>{title}</h2>
        </div>
        {more}
      </div>
      {isError ? (
        <p className="muted">Couldn't load this shelf right now. Please try again shortly.</p>
      ) : (
        <div className="row-scroll">
          {isLoading ? <SkeletonCards n={7} /> : data?.map((b) => <BookCard key={`${b.source}-${b.id}`} book={b} />)}
        </div>
      )}
    </section>
  );
}

export function SeeAll(props: { q: string; field?: "genre" | "author" | "title"; sort?: "newest" }) {
  return <Link to="/discover" search={props}>See all <ArrowRight size={14} /></Link>;
}
