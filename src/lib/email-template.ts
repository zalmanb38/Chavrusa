import { SITE_URL } from "@/lib/site";

/**
 * The transactional email shell.
 *
 * Email is not the web: no external stylesheet, no custom font that will
 * load, no grid. So this is a table-free single column with inline styles
 * and the palette's hex values written out — the token layer doesn't
 * reach here, which means a palette change has to be repeated in this
 * file by hand.
 *
 * The header photograph ships untreated: the halftone is a CSS mask, and
 * no mail client will run it. Many clients also block remote images by
 * default, so nothing the reader needs is in it.
 *
 * Every message also goes out as plain text. Some clients show that
 * instead, and a notification that only exists as HTML is a notification
 * some people never receive.
 */

const PAPER = "#f8f6f0";
const INK = "#1b2430";
const MUTED = "#59544c";
const SLATE = "#1c4b8f";
const GOLD = "#c48f2a";
const HAIRLINE = "#ddd8cc";

export interface EmailContent {
  /** Shown large at the top of the body. */
  heading: string;
  /** One or more paragraphs. */
  paragraphs: string[];
  /**
   * `path` is relative to the site and picks up the locale prefix; `url`
   * is absolute and used exactly as given. The auth emails need the
   * second kind: their links point at Supabase's verify endpoint, which
   * is not a page on this site.
   */
  action?: { label: string; path: string } | { label: string; url: string };
  /** Quiet line under the action — context, not instruction. */
  footnote?: string;
}

function resolveActionUrl(
  action: EmailContent["action"],
  locale: string,
): string | null {
  if (!action) return null;
  return "url" in action ? action.url : `${SITE_URL}/${locale}${action.path}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderEmailHtml(content: EmailContent, locale: string): string {
  const url = resolveActionUrl(content.action, locale);

  // A newline inside a paragraph is a deliberate line break, and HTML
  // would otherwise collapse it. Applied after escaping, never before, so
  // the break is the only markup a message string can introduce.
  const paragraphs = content.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:${INK};">${escapeHtml(p).replace(/\n/g, "<br />")}</p>`,
    )
    .join("");

  const action =
    content.action && url
      ? `<p style="margin:24px 0 0;">
           <a href="${escapeHtml(url)}" style="display:inline-block;background:${SLATE};color:${PAPER};text-decoration:none;padding:12px 24px;font-size:16px;font-weight:600;border-radius:2px;">${escapeHtml(content.action.label)}</a>
         </p>`
      : "";

  const footnote = content.footnote
    ? `<p style="margin:20px 0 0;font-size:13px;line-height:1.5;color:${MUTED};">${escapeHtml(content.footnote)}</p>`
    : "";

  // dir is set from the locale so Hebrew reads correctly; the serif stack
  // degrades to whatever the client has, since webfonts don't load here.
  const dir = locale === "he" ? "rtl" : "ltr";

  return `<!doctype html>
<html lang="${locale}" dir="${dir}">
  <body style="margin:0;padding:0;background:${PAPER};">
    <div style="max-width:560px;margin:0 auto;padding:32px 24px 40px;font-family:Georgia,'Times New Roman',serif;">
      <img src="${SITE_URL}/photos/p7-tefillin-bag.jpg" alt="" width="512" style="display:block;width:100%;max-width:512px;height:140px;object-fit:cover;margin-bottom:16px;" />

      <div style="border-bottom:2px solid ${GOLD};padding-bottom:12px;margin-bottom:28px;">
        <span style="font-size:20px;color:${INK};">Chavrusa Link</span>
      </div>

      <h1 style="margin:0 0 18px;font-size:26px;line-height:1.15;font-weight:600;color:${INK};">${escapeHtml(content.heading)}</h1>

      ${paragraphs}
      ${action}
      ${footnote}

      <div style="border-top:1px solid ${HAIRLINE};margin-top:36px;padding-top:16px;">
        <p style="margin:0;font-size:12px;line-height:1.5;color:${MUTED};">
          <a href="${SITE_URL}/${locale}" style="color:${MUTED};">chavrusalink.com</a>
        </p>
      </div>
    </div>
  </body>
</html>`;
}

/** The same content as plain text, for clients that show that instead. */
export function renderEmailText(content: EmailContent, locale: string): string {
  // Paragraphs are separated by a blank line, not a newline: run together,
  // two of them read as one wrapped sentence in a plain-text client.
  const lines = [content.heading, "", content.paragraphs.join("\n\n")];
  if (content.action) {
    lines.push(
      "",
      `${content.action.label}: ${resolveActionUrl(content.action, locale)}`,
    );
  }
  if (content.footnote) lines.push("", content.footnote);
  lines.push("", `${SITE_URL}/${locale}`);
  return lines.join("\n");
}
