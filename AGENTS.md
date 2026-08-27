<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Copy changes require explicit approval

Never change any user-facing text on the site — strings in `messages/*.json`,
or hardcoded text in any `.tsx` file — without first getting Zalman's
explicit approval on the exact final wording, for every affected locale.

A design brief or handoff document calling for a copy change in general
terms is not itself approval. Propose the specific before/after text and
wait for a yes before implementing it, even when a document says to change
that section's wording.

This does not restrict layout, spacing, component structure, or any other
non-text code — only visible copy.
