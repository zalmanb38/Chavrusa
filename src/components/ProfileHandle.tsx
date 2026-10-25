/**
 * Someone's handle, shown beside their display name.
 *
 * Renders nothing for the people who haven't chosen one, which is most of
 * them — the field is optional, so an empty handle is a normal state and
 * not a gap to fill with a placeholder.
 */
export default function ProfileHandle({
  username,
  className = "",
}: {
  username: string | null | undefined;
  className?: string;
}) {
  const handle = username?.trim();

  if (!handle) {
    return null;
  }

  return (
    // Latin-only by nature, so it stays left-to-right on the Hebrew side
    // of the site.
    <span dir="ltr" className={`text-muted ${className}`}>
      @{handle}
    </span>
  );
}
