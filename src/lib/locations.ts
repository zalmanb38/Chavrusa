// Curated location data for profiles.
//
// Deliberately not exhaustive: the point is that someone in a real Jewish
// community finds their city in one tap, not that every settlement on
// earth is represented. "Other" carries the rest as free text.
//
// Place names are stored and displayed as written here rather than
// translated. Country names get translations (they're common nouns in
// every language); cities and states are proper nouns that address forms
// conventionally leave alone, and translating ~200 of them four ways
// would be a maintenance burden with little to show for it.

export const COUNTRY_CODES = ["US", "CA", "IL", "GB", "FR", "OTHER"] as const;
export type CountryCode = (typeof COUNTRY_CODES)[number];

/** Sentinel for "my city isn't listed" — paired with free text. */
export const OTHER_VALUE = "__other__";

export interface Region {
  code: string;
  name: string;
}

// Only the US and Canada get a second tier. Israel, the UK and France are
// small enough that a flat city list is quicker to use than a region step,
// and it sidesteps the question of which regional scheme to adopt.
export const REGIONS: Partial<Record<CountryCode, Region[]>> = {
  US: [
    { code: "NY", name: "New York" },
    { code: "NJ", name: "New Jersey" },
    { code: "CA", name: "California" },
    { code: "FL", name: "Florida" },
    { code: "IL", name: "Illinois" },
    { code: "MD", name: "Maryland" },
    { code: "PA", name: "Pennsylvania" },
    { code: "MA", name: "Massachusetts" },
    { code: "OH", name: "Ohio" },
    { code: "TX", name: "Texas" },
    { code: "GA", name: "Georgia" },
    { code: "MI", name: "Michigan" },
    { code: "MO", name: "Missouri" },
    { code: "CO", name: "Colorado" },
    { code: "AZ", name: "Arizona" },
    { code: "NV", name: "Nevada" },
    { code: "WA", name: "Washington" },
    { code: "CT", name: "Connecticut" },
    { code: "MN", name: "Minnesota" },
    { code: "WI", name: "Wisconsin" },
    { code: "TN", name: "Tennessee" },
    { code: "NC", name: "North Carolina" },
    { code: "VA", name: "Virginia" },
    { code: "DC", name: "Washington, D.C." },
    { code: "IN", name: "Indiana" },
    { code: "KY", name: "Kentucky" },
    { code: "LA", name: "Louisiana" },
    { code: "OR", name: "Oregon" },
    { code: "RI", name: "Rhode Island" },
    { code: "DE", name: "Delaware" },
    { code: "OTHER", name: "Other" },
  ],
  CA: [
    { code: "ON", name: "Ontario" },
    { code: "QC", name: "Quebec" },
    { code: "BC", name: "British Columbia" },
    { code: "AB", name: "Alberta" },
    { code: "MB", name: "Manitoba" },
    { code: "NS", name: "Nova Scotia" },
    { code: "OTHER", name: "Other" },
  ],
};

/**
 * Keyed by `COUNTRY` for flat lists, or `COUNTRY-REGION` where a region
 * tier exists.
 */
export const CITIES: Record<string, string[]> = {
  "US-NY": [
    "Brooklyn", "Monsey", "Queens", "Manhattan",
    "Spring Valley", "New Square", "Kiryas Joel", "Suffern", "Staten Island",
    "Cedarhurst", "Lawrence", "Woodmere", "Great Neck", "Far Rockaway",
    "White Plains", "New Rochelle", "Rochester", "Buffalo", "Albany",
  ],
  "US-NJ": [
    "Lakewood", "Teaneck", "Passaic", "Edison", "Highland Park", "Elizabeth",
    "Fair Lawn", "Englewood", "Toms River", "Jackson", "Deal", "Livingston",
    "West Orange", "Cherry Hill", "Bergenfield", "Clifton", "Howell",
  ],
  "US-CA": [
    "Los Angeles", "Beverly Hills", "Valley Village", "North Hollywood",
    "San Diego", "San Francisco", "Palo Alto", "Berkeley", "Irvine",
    "Long Beach", "Sacramento", "Oakland",
  ],
  "US-FL": [
    "Miami Beach", "North Miami Beach", "Aventura", "Boca Raton", "Hollywood",
    "Surfside", "Bal Harbour", "Sunny Isles Beach", "Orlando", "Jacksonville",
    "Tampa", "West Palm Beach",
  ],
  "US-IL": ["Chicago", "Skokie", "Lincolnwood", "Buffalo Grove", "Highland Park", "Wilmette"],
  "US-MD": ["Baltimore", "Silver Spring", "Potomac", "Rockville", "Pikesville", "Bethesda"],
  "US-PA": ["Philadelphia", "Bala Cynwyd", "Pittsburgh", "Allentown", "Elkins Park", "Scranton"],
  "US-MA": ["Boston", "Brookline", "Newton", "Sharon", "Worcester", "Springfield"],
  "US-OH": ["Cleveland", "Beachwood", "University Heights", "Columbus", "Cincinnati", "Dayton"],
  "US-TX": ["Houston", "Dallas", "Austin", "San Antonio", "El Paso"],
  "US-GA": ["Atlanta", "Sandy Springs", "Toco Hills", "Savannah"],
  "US-MI": ["Detroit", "Oak Park", "Southfield", "West Bloomfield", "Ann Arbor"],
  "US-MO": ["St. Louis", "Kansas City", "University City"],
  "US-CO": ["Denver", "Boulder", "Colorado Springs"],
  "US-AZ": ["Phoenix", "Scottsdale", "Tucson"],
  "US-NV": ["Las Vegas", "Henderson", "Reno"],
  "US-WA": ["Seattle", "Mercer Island", "Bellevue"],
  "US-CT": ["Stamford", "West Hartford", "New Haven", "Waterbury", "Norwalk"],
  "US-MN": ["Minneapolis", "St. Paul", "St. Louis Park"],
  "US-WI": ["Milwaukee", "Madison", "Glendale"],
  "US-TN": ["Memphis", "Nashville", "Knoxville"],
  "US-NC": ["Charlotte", "Raleigh", "Durham", "Greensboro"],
  "US-VA": ["Richmond", "Norfolk", "Virginia Beach", "Alexandria", "Arlington"],
  "US-DC": ["Washington"],
  "US-IN": ["Indianapolis", "South Bend"],
  "US-KY": ["Louisville", "Lexington"],
  "US-LA": ["New Orleans", "Baton Rouge"],
  "US-OR": ["Portland", "Eugene"],
  "US-RI": ["Providence"],
  "US-DE": ["Wilmington", "Newark"],

  "CA-ON": ["Toronto", "Thornhill", "North York", "Ottawa", "Hamilton", "London", "Windsor"],
  "CA-QC": ["Montreal", "Côte Saint-Luc", "Hampstead", "Outremont", "Dollard-des-Ormeaux", "Quebec City"],
  "CA-BC": ["Vancouver", "Richmond", "Victoria", "Burnaby"],
  "CA-AB": ["Calgary", "Edmonton"],
  "CA-MB": ["Winnipeg"],
  "CA-NS": ["Halifax"],

  IL: [
    "Jerusalem", "Bnei Brak", "Tel Aviv", "Beit Shemesh", "Beitar Illit",
    "Modiin Illit", "Ashdod", "Netanya", "Petah Tikva", "Rehovot", "Haifa",
    "Tzfat", "Tiberias", "Elad", "Ramat Gan", "Givat Shmuel", "Rishon LeZion",
    "Ashkelon", "Beer Sheva", "Efrat", "Ma'ale Adumim", "Ra'anana",
    "Kfar Saba", "Herzliya", "Modiin", "Hadera", "Rechasim", "Ariel",
    "Kiryat Gat", "Netivot", "Eilat", "Zichron Yaakov",
  ],
  GB: [
    "London", "Manchester", "Gateshead", "Leeds", "Liverpool", "Glasgow",
    "Birmingham", "Brighton", "Bournemouth", "Edinburgh", "Borehamwood",
    "Cardiff", "Newcastle",
  ],
  FR: [
    "Paris", "Marseille", "Lyon", "Strasbourg", "Toulouse", "Nice",
    "Sarcelles", "Créteil", "Villeurbanne", "Bordeaux", "Grenoble",
    "Aix-en-Provence", "Metz", "Nancy", "Antibes",
  ],
};

export function regionsFor(country: string): Region[] {
  return REGIONS[country as CountryCode] ?? [];
}

export function hasRegions(country: string): boolean {
  return regionsFor(country).length > 0;
}

export function citiesFor(country: string, region: string): string[] {
  if (!country || country === "OTHER") return [];
  if (hasRegions(country)) {
    if (!region || region === "OTHER") return [];
    return CITIES[`${country}-${region}`] ?? [];
  }
  return CITIES[country] ?? [];
}

/**
 * Location is only compulsory for people who exclusively meet in person —
 * for everyone else it's optional context, so requiring it would be
 * asking for data the site has no use for.
 */
export function locationRequired(preference: string): boolean {
  return preference === "in_person";
}

/**
 * The short form shown beside a learner's name: neighbourhood, city and
 * state. Country is left off — it added a fourth clause to every row for
 * information that is the same for nearly everyone reading it, and state
 * already says where someone is.
 *
 * Needs no translator, since region and city names are proper nouns kept
 * as written.
 */
export function formatLocationShort(parts: {
  city?: string | null;
  region?: string | null;
  country?: string | null;
  neighborhood?: string | null;
}): string {
  const regionName = parts.region
    ? (regionsFor(parts.country ?? "").find((r) => r.code === parts.region)
        ?.name ?? parts.region)
    : "";

  return [parts.neighborhood?.trim(), parts.city?.trim(), regionName]
    .filter((piece): piece is string => Boolean(piece && piece.length > 0))
    .join(", ");
}

/** The full form, country included — used where precision matters. */
export function formatLocation(
  parts: {
    city?: string | null;
    region?: string | null;
    country?: string | null;
    neighborhood?: string | null;
  },
  countryName: (code: string) => string,
): string {
  const regionName = parts.region
    ? (regionsFor(parts.country ?? "").find((r) => r.code === parts.region)
        ?.name ?? parts.region)
    : "";

  return [
    parts.neighborhood?.trim(),
    parts.city?.trim(),
    regionName,
    parts.country && parts.country !== "OTHER"
      ? countryName(parts.country)
      : "",
  ]
    .filter((piece): piece is string => Boolean(piece && piece.length > 0))
    .join(", ");
}
