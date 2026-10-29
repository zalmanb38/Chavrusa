import { useTranslations } from "next-intl";

/**
 * The asterisk that marks a field save actually refuses to accept empty.
 *
 * Clay, the one alert colour — a required field is not an alert, but the
 * mark has to be findable while skimming a long form, and the palette has
 * nothing else that reads as "attention" on paper ground. The glyph is
 * decoration to a screen reader, which gets the word instead; `required`
 * on the input is what it actually announces.
 */
export default function RequiredMark() {
  const t = useTranslations("Common");

  return (
    <>
      <bdi aria-hidden="true" className="text-clay">
        *
      </bdi>
      <span className="sr-only">{t("required")}</span>
    </>
  );
}
