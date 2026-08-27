import { splitBold, type ProseDoc } from "@/lib/prose";

/** Renders `**bold**` runs as <strong> without dangerouslySetInnerHTML. */
function RichText({ text }: { text: string }) {
  return (
    <>
      {splitBold(text).map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold">
            {part}
          </strong>
        ) : (
          part
        ),
      )}
    </>
  );
}

export default function ProseDocument({
  doc,
  translationNote,
}: {
  doc: ProseDoc;
  translationNote?: string;
}) {
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="border-b-[3px] border-primary pb-3 text-[2.25rem] font-semibold sm:text-[40px]">
          {doc.title}
        </h1>
        {doc.lastUpdated && (
          <p className="text-sm text-muted">{doc.lastUpdated}</p>
        )}
      </header>

      {translationNote && (
        <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
          {translationNote}
        </p>
      )}

      {doc.blocks.map((block, i) => {
        if (block.type === "h2") {
          return (
            <h2 key={i} className="mt-3 font-serif text-xl font-medium">
              {block.text}
            </h2>
          );
        }
        if (block.type === "ul") {
          return (
            <ul key={i} className="flex list-disc flex-col gap-2 ps-6">
              {block.items.map((item, j) => (
                <li key={j} className="leading-relaxed">
                  <RichText text={item} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="leading-relaxed">
            <RichText text={block.text} />
          </p>
        );
      })}
    </article>
  );
}
