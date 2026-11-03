import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Proxy for Project Gutenberg plain-text files (the site does not allow browser CORS reads).
export const fetchGutenbergText = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().regex(/^\d+$/) }).parse(input))
  .handler(async ({ data }) => {
    const urls = [
      `https://www.gutenberg.org/cache/epub/${data.id}/pg${data.id}.txt`,
      `https://www.gutenberg.org/files/${data.id}/${data.id}-0.txt`,
    ];
    for (const url of urls) {
      const res = await fetch(url, { headers: { "User-Agent": "BookNook/1.0" } });
      if (!res.ok) continue;
      let text = await res.text();
      const start = text.search(/\*\*\* ?START OF (THE|THIS) PROJECT GUTENBERG[^\n]*\n/i);
      if (start >= 0) text = text.slice(text.indexOf("\n", start) + 1);
      const end = text.search(/\*\*\* ?END OF (THE|THIS) PROJECT GUTENBERG/i);
      if (end >= 0) text = text.slice(0, end);
      return { text: text.trim() };
    }
    throw new Error("This book's text is not available right now.");
  });
