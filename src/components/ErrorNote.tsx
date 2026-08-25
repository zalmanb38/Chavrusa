/**
 * The product's one error pattern, from the design handoff: a 2px clay
 * left rule, a clay-100 tint behind, text at clay-800.
 *
 * "One clay element per screen. No red, no icons, no toasts." Clay is the
 * alert colour and nothing else uses it, which is what makes it read as an
 * alert — so a screen showing two of these at once has a design problem,
 * not just a styling one.
 */
export default function ErrorNote({
  children,
  size = "sm",
}: {
  children: React.ReactNode;
  /** `xs` for help beneath a single field, `sm` for a form-level banner. */
  size?: "xs" | "sm";
}) {
  return (
    <p
      role="alert"
      className={`border-s-2 border-clay bg-clay-tint px-3 py-2 text-clay-text ${
        size === "xs" ? "text-xs" : "text-sm"
      }`}
    >
      {children}
    </p>
  );
}
