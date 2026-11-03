// Book data service layer — all external API calls live here.
// Configure via env: VITE_GOOGLE_BOOKS_API_KEY (optional), VITE_API_BASE_URL (future backend).

export type Source = "google" | "openlibrary";

export interface Book {
  id: string;
  source: Source;
  title: string;
  authors: string[];
  cover?: string;
  description?: string;
  publisher?: string;
  publishedDate?: string;
  isbn?: string;
  categories?: string[];
  pageCount?: number;
  language?: string;
  rating?: number;
  previewLink?: string;
  readable?: boolean;
  iaId?: string;
}

export interface SearchParams {
  q: string;
  field?: "all" | "title" | "author" | "isbn" | "genre";
  sort?: "relevance" | "newest";
  page?: number;
  perPage?: number;
  lang?: string;
  free?: boolean;
  source?: Source;
}

export interface SearchResult {
  items: Book[];
  total: number;
  source: Source;
}

const GOOGLE = "https://www.googleapis.com/books/v1";
const OL = "https://openlibrary.org";
const googleKey = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY as string | undefined;

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json() as Promise<T>;
}

const https = (u?: string) => u?.replace(/^http:/, "https:");

/* ---------------- Google Books ---------------- */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromGoogle(v: any): Book {
  const i = v.volumeInfo ?? {};
  const ids: { type: string; identifier: string }[] = i.industryIdentifiers ?? [];
  const img = i.imageLinks?.thumbnail ?? i.imageLinks?.smallThumbnail;
  return {
    id: v.id,
    source: "google",
    title: i.title ?? "Untitled",
    authors: i.authors ?? [],
    cover: img ? https(img)!.replace("&edge=curl", "").replace("zoom=1", "zoom=2") : undefined,
    description: i.description,
    publisher: i.publisher,
    publishedDate: i.publishedDate,
    isbn: (ids.find((x) => x.type === "ISBN_13") ?? ids.find((x) => x.type === "ISBN_10"))?.identifier,
    categories: i.categories,
    pageCount: i.pageCount,
    language: i.language,
    rating: i.averageRating,
    previewLink: https(i.previewLink),
    readable: ["ALL_PAGES", "PARTIAL"].includes(v.accessInfo?.viewability),
  };
}

async function googleSearch(p: SearchParams): Promise<SearchResult> {
  const prefix = { all: "", title: "intitle:", author: "inauthor:", isbn: "isbn:", genre: "subject:" }[p.field ?? "all"];
  const per = p.perPage ?? 20;
  const qs = new URLSearchParams({
    q: `${prefix}${p.q}`,
    startIndex: String(((p.page ?? 1) - 1) * per),
    maxResults: String(per),
    printType: "books",
    orderBy: p.sort ?? "relevance",
  });
  if (p.lang) qs.set("langRestrict", p.lang);
  if (p.free) qs.set("filter", "free-ebooks");
  if (googleKey) qs.set("key", googleKey);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await getJSON<any>(`${GOOGLE}/volumes?${qs}`);
  return { items: (data.items ?? []).map(fromGoogle), total: data.totalItems ?? 0, source: "google" };
}

/* ---------------- Open Library ---------------- */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromOLDoc(d: any): Book {
  return {
    id: String(d.key ?? "").replace("/works/", ""),
    source: "openlibrary",
    title: d.title ?? "Untitled",
    authors: d.author_name ?? [],
    cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : undefined,
    publishedDate: d.first_publish_year ? String(d.first_publish_year) : undefined,
    publisher: d.publisher?.[0],
    isbn: d.isbn?.[0],
    categories: d.subject?.slice(0, 4),
    language: d.language?.[0],
    readable: d.ebook_access === "public" || d.has_fulltext === true && d.ebook_access === "public",
    iaId: d.ebook_access === "public" ? d.ia?.[0] : undefined,
  };
}

const OL_FIELDS = "key,title,author_name,cover_i,first_publish_year,publisher,isbn,subject,language,ebook_access,has_fulltext,ia";

async function olSearch(p: SearchParams): Promise<SearchResult> {
  const per = p.perPage ?? 20;
  const key = { all: "q", title: "title", author: "author", isbn: "isbn", genre: "subject" }[p.field ?? "all"];
  const qs = new URLSearchParams({ [key]: p.q, page: String(p.page ?? 1), limit: String(per), fields: OL_FIELDS });
  if (p.sort === "newest") qs.set("sort", "new");
  if (p.lang) qs.set("language", ({ en: "eng", hi: "hin", fr: "fre", es: "spa", de: "ger" } as Record<string, string>)[p.lang] ?? p.lang);
  if (p.free) qs.set("ebook_access", "public");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await getJSON<any>(`${OL}/search.json?${qs}`);
  return { items: (data.docs ?? []).map(fromOLDoc).filter((b: Book) => b.id), total: data.numFound ?? 0, source: "openlibrary" };
}

/** Search with chosen source; Google falls back to Open Library on failure / rate limit. */
export async function searchBooks(p: SearchParams): Promise<SearchResult> {
  if (p.source === "openlibrary") return olSearch(p);
  try {
    const r = await googleSearch(p);
    if (r.items.length || (p.page ?? 1) > 1) return r;
    return await olSearch(p);
  } catch {
    return olSearch(p);
  }
}

export async function trendingBooks(period: "daily" | "weekly" = "weekly", limit = 16): Promise<Book[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await getJSON<any>(`${OL}/trending/${period}.json?limit=${limit}`);
  return (data.works ?? []).map(fromOLDoc).filter((b: Book) => b.cover);
}

export async function subjectBooks(subject: string, limit = 16): Promise<Book[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await getJSON<any>(`${OL}/subjects/${encodeURIComponent(subject)}.json?limit=${limit}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.works ?? []).map((w: any) => fromOLDoc({ ...w, author_name: w.authors?.map((a: any) => a.name), cover_i: w.cover_id, first_publish_year: w.first_publish_year })).filter((b: Book) => b.cover);
}

export async function getBook(source: Source, id: string): Promise<Book> {
  if (source === "google") {
    const qs = googleKey ? `?key=${googleKey}` : "";
    return fromGoogle(await getJSON(`${GOOGLE}/volumes/${id}${qs}`));
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = await getJSON<any>(`${OL}/works/${id}.json`);
  const authors = await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (w.authors ?? []).slice(0, 3).map((a: any) => getJSON<any>(`${OL}${a.author.key}.json`).then((x) => x.name as string).catch(() => "")),
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let edition: any = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  try { edition = (await getJSON<any>(`${OL}/works/${id}/editions.json?limit=1`)).entries?.[0] ?? {}; } catch { /* optional */ }
  const desc = typeof w.description === "string" ? w.description : w.description?.value;
  return {
    id,
    source: "openlibrary",
    title: w.title,
    authors: authors.filter(Boolean),
    cover: w.covers?.[0] ? `https://covers.openlibrary.org/b/id/${w.covers[0]}-L.jpg` : undefined,
    description: desc,
    publisher: edition.publishers?.[0],
    publishedDate: edition.publish_date ?? w.first_publish_date,
    isbn: edition.isbn_13?.[0] ?? edition.isbn_10?.[0],
    categories: w.subjects?.slice(0, 6),
    pageCount: edition.number_of_pages,
    iaId: edition.ocaid,
  };
}

/* ---------------- Free reading: Gutendex & Internet Archive ---------------- */
export interface FreeBook {
  id: string;
  source: "gutenberg" | "archive";
  title: string;
  authors: string[];
  cover?: string;
  downloads?: number;
  subjects?: string[];
}

export async function gutenbergBooks(opts: { search?: string; topic?: string; page?: number }) {
  const qs = new URLSearchParams({ page: String(opts.page ?? 1) });
  if (opts.search) qs.set("search", opts.search);
  if (opts.topic) qs.set("topic", opts.topic);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await getJSON<any>(`https://gutendex.com/books?${qs}`);
  return {
    total: data.count as number,
    hasNext: !!data.next,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: (data.results ?? []).map((b: any): FreeBook => ({
      id: String(b.id),
      source: "gutenberg",
      title: b.title,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      authors: (b.authors ?? []).map((a: any) => a.name.split(", ").reverse().join(" ")),
      cover: b.formats?.["image/jpeg"],
      downloads: b.download_count,
      subjects: b.subjects,
    })),
  };
}

export async function archiveBooks(opts: { search?: string; page?: number }) {
  const q = `mediatype:texts AND collection:(opensource OR gutenberg OR americana) AND -access-restricted-item:true${opts.search ? ` AND (${opts.search})` : ""}`;
  const qs = new URLSearchParams({ q, rows: "24", page: String(opts.page ?? 1), output: "json", "sort[]": "downloads desc" });
  ["identifier", "title", "creator", "downloads"].forEach((f) => qs.append("fl[]", f));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await getJSON<any>(`https://archive.org/advancedsearch.php?${qs}`);
  return {
    total: data.response?.numFound ?? 0,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: (data.response?.docs ?? []).map((d: any): FreeBook => ({
      id: d.identifier,
      source: "archive",
      title: d.title,
      authors: d.creator ? [].concat(d.creator) : [],
      cover: `https://archive.org/services/img/${d.identifier}`,
      downloads: d.downloads,
    })),
  };
}

export const purchaseLinks = (b: Book) => {
  const q = encodeURIComponent(`${b.title} ${b.authors[0] ?? ""}`.trim());
  return { amazon: `https://www.amazon.in/s?k=${q}&i=stripbooks`, flipkart: `https://www.flipkart.com/search?q=${q}` };
};
