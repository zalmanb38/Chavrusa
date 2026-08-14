// Country dial codes for the phone verification field. Curated rather than
// exhaustive: the app ships in English, Hebrew, French and Spanish, so the
// list leads with the countries those speakers are most likely in, then
// covers other common places learners sign up from.
export interface CountryCode {
  /** ISO 3166-1 alpha-2, used only as a stable React key. */
  iso: string;
  /** E.164 dial prefix, including the leading "+". */
  dial: string;
  /** English country name; shown alongside the dial code. */
  name: string;
  flag: string;
}

export const COUNTRY_CODES: CountryCode[] = [
  { iso: "US", dial: "+1", name: "USA & Canada", flag: "🇺🇸" },
  { iso: "IL", dial: "+972", name: "Israel", flag: "🇮🇱" },
  { iso: "GB", dial: "+44", name: "United Kingdom", flag: "🇬🇧" },
  { iso: "FR", dial: "+33", name: "France", flag: "🇫🇷" },
  { iso: "ES", dial: "+34", name: "Spain", flag: "🇪🇸" },
  { iso: "MX", dial: "+52", name: "Mexico", flag: "🇲🇽" },
  { iso: "AR", dial: "+54", name: "Argentina", flag: "🇦🇷" },
  { iso: "BR", dial: "+55", name: "Brazil", flag: "🇧🇷" },
  { iso: "CL", dial: "+56", name: "Chile", flag: "🇨🇱" },
  { iso: "CO", dial: "+57", name: "Colombia", flag: "🇨🇴" },
  { iso: "PE", dial: "+51", name: "Peru", flag: "🇵🇪" },
  { iso: "VE", dial: "+58", name: "Venezuela", flag: "🇻🇪" },
  { iso: "UY", dial: "+598", name: "Uruguay", flag: "🇺🇾" },
  { iso: "PA", dial: "+507", name: "Panama", flag: "🇵🇦" },
  { iso: "BE", dial: "+32", name: "Belgium", flag: "🇧🇪" },
  { iso: "CH", dial: "+41", name: "Switzerland", flag: "🇨🇭" },
  { iso: "DE", dial: "+49", name: "Germany", flag: "🇩🇪" },
  { iso: "IT", dial: "+39", name: "Italy", flag: "🇮🇹" },
  { iso: "NL", dial: "+31", name: "Netherlands", flag: "🇳🇱" },
  { iso: "AU", dial: "+61", name: "Australia", flag: "🇦🇺" },
  { iso: "ZA", dial: "+27", name: "South Africa", flag: "🇿🇦" },
  { iso: "UA", dial: "+380", name: "Ukraine", flag: "🇺🇦" },
  { iso: "RU", dial: "+7", name: "Russia & Kazakhstan", flag: "🇷🇺" },
];

export const DEFAULT_DIAL_CODE = "+1";

/**
 * Split a stored E.164 number back into a dial code and the national part,
 * so an already-verified number repopulates the form correctly. Matches the
 * longest dial code first, since e.g. "+1" prefixes nothing else here but
 * "+5" cases like +51/+52/+55 would otherwise collide with each other.
 */
export function splitPhone(e164: string | null): {
  dial: string;
  national: string;
} {
  if (!e164) return { dial: DEFAULT_DIAL_CODE, national: "" };

  const match = [...COUNTRY_CODES]
    .sort((a, b) => b.dial.length - a.dial.length)
    .find((c) => e164.startsWith(c.dial));

  if (!match) return { dial: DEFAULT_DIAL_CODE, national: e164.replace(/\D/g, "") };

  return { dial: match.dial, national: e164.slice(match.dial.length) };
}
