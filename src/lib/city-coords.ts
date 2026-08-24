// Coordinates for the curated city list, for the Browse map view.
//
// Static data rather than a geocoding service: the city list is finite and
// ours, so there's nothing to look up at runtime — no API key, no network
// call, no cache to invalidate, and a city can't silently move because a
// third party changed its mind about what "Richmond" means.
//
// Keys are `COUNTRY-REGION:City` for the two-tier countries and
// `COUNTRY:City` for the flat ones, matching how CITIES is keyed in
// locations.ts. The qualification isn't decoration: London is both
// Ontario and England, Richmond is both Virginia and British Columbia,
// and Highland Park is both New Jersey and Illinois.
//
// Precision is deliberately modest — these place a marker at city zoom,
// not a pin on a doorstep, and the map never renders a single person's
// location anyway.

export type LatLng = [number, number];

export const CITY_COORDS: Record<string, LatLng> = {
  // --- United States ---------------------------------------------------
  "US-NY:Brooklyn": [40.6782, -73.9442],
  "US-NY:Monsey": [41.1112, -74.0687],
  "US-NY:Queens": [40.7282, -73.7949],
  "US-NY:Manhattan": [40.7831, -73.9712],
  "US-NY:Spring Valley": [41.1132, -74.0437],
  "US-NY:New Square": [41.1401, -74.029],
  "US-NY:Kiryas Joel": [41.342, -74.1663],
  "US-NY:Suffern": [41.1148, -74.1496],
  "US-NY:Staten Island": [40.5795, -74.1502],
  "US-NY:Cedarhurst": [40.6229, -73.7268],
  "US-NY:Lawrence": [40.6162, -73.7296],
  "US-NY:Woodmere": [40.632, -73.7126],
  "US-NY:Great Neck": [40.8007, -73.7285],
  "US-NY:Far Rockaway": [40.6048, -73.7551],
  "US-NY:White Plains": [41.034, -73.7629],
  "US-NY:New Rochelle": [40.9115, -73.7824],
  "US-NY:Rochester": [43.1566, -77.6088],
  "US-NY:Buffalo": [42.8864, -78.8784],
  "US-NY:Albany": [42.6526, -73.7562],

  "US-NJ:Lakewood": [40.0979, -74.2179],
  "US-NJ:Teaneck": [40.8976, -74.016],
  "US-NJ:Passaic": [40.8568, -74.1285],
  "US-NJ:Edison": [40.5187, -74.4121],
  "US-NJ:Highland Park": [40.4959, -74.4243],
  "US-NJ:Elizabeth": [40.6639, -74.2107],
  "US-NJ:Fair Lawn": [40.9404, -74.1318],
  "US-NJ:Englewood": [40.8929, -73.9726],
  "US-NJ:Toms River": [39.9537, -74.1979],
  "US-NJ:Jackson": [40.129, -74.361],
  "US-NJ:Deal": [40.2515, -74.0004],
  "US-NJ:Livingston": [40.7959, -74.3149],
  "US-NJ:West Orange": [40.7987, -74.239],
  "US-NJ:Cherry Hill": [39.9348, -75.0307],
  "US-NJ:Bergenfield": [40.9276, -73.9976],
  "US-NJ:Clifton": [40.8584, -74.1638],
  "US-NJ:Howell": [40.1748, -74.2007],

  "US-CA:Los Angeles": [34.0522, -118.2437],
  "US-CA:Beverly Hills": [34.0736, -118.4004],
  "US-CA:Valley Village": [34.1667, -118.3962],
  "US-CA:North Hollywood": [34.187, -118.3813],
  "US-CA:San Diego": [32.7157, -117.1611],
  "US-CA:San Francisco": [37.7749, -122.4194],
  "US-CA:Palo Alto": [37.4419, -122.143],
  "US-CA:Berkeley": [37.8715, -122.273],
  "US-CA:Irvine": [33.6846, -117.8265],
  "US-CA:Long Beach": [33.7701, -118.1937],
  "US-CA:Sacramento": [38.5816, -121.4944],
  "US-CA:Oakland": [37.8044, -122.2712],

  "US-FL:Miami Beach": [25.7907, -80.13],
  "US-FL:North Miami Beach": [25.9331, -80.1625],
  "US-FL:Aventura": [25.9565, -80.1392],
  "US-FL:Boca Raton": [26.3683, -80.1289],
  "US-FL:Hollywood": [26.0112, -80.1495],
  "US-FL:Surfside": [25.8787, -80.1223],
  "US-FL:Bal Harbour": [25.8918, -80.1265],
  "US-FL:Sunny Isles Beach": [25.949, -80.1225],
  "US-FL:Orlando": [28.5383, -81.3792],
  "US-FL:Jacksonville": [30.3322, -81.6557],
  "US-FL:Tampa": [27.9506, -82.4572],
  "US-FL:West Palm Beach": [26.7153, -80.0534],

  "US-IL:Chicago": [41.8781, -87.6298],
  "US-IL:Skokie": [42.0334, -87.7334],
  "US-IL:Lincolnwood": [42.0064, -87.7328],
  "US-IL:Buffalo Grove": [42.1663, -87.9631],
  "US-IL:Highland Park": [42.1817, -87.8003],
  "US-IL:Wilmette": [42.0722, -87.7228],

  "US-MD:Baltimore": [39.2904, -76.6122],
  "US-MD:Silver Spring": [38.9907, -77.0261],
  "US-MD:Potomac": [39.0182, -77.2086],
  "US-MD:Rockville": [39.084, -77.1528],
  "US-MD:Pikesville": [39.3743, -76.7225],
  "US-MD:Bethesda": [38.9847, -77.0947],

  "US-PA:Philadelphia": [39.9526, -75.1652],
  "US-PA:Bala Cynwyd": [40.0043, -75.2338],
  "US-PA:Pittsburgh": [40.4406, -79.9959],
  "US-PA:Allentown": [40.6084, -75.4902],
  "US-PA:Elkins Park": [40.0762, -75.1274],
  "US-PA:Scranton": [41.409, -75.6624],

  "US-MA:Boston": [42.3601, -71.0589],
  "US-MA:Brookline": [42.3318, -71.1212],
  "US-MA:Newton": [42.337, -71.2092],
  "US-MA:Sharon": [42.1237, -71.1789],
  "US-MA:Worcester": [42.2626, -71.8023],
  "US-MA:Springfield": [42.1015, -72.5898],

  "US-OH:Cleveland": [41.4993, -81.6944],
  "US-OH:Beachwood": [41.4645, -81.509],
  "US-OH:University Heights": [41.4948, -81.5346],
  "US-OH:Columbus": [39.9612, -82.9988],
  "US-OH:Cincinnati": [39.1031, -84.512],
  "US-OH:Dayton": [39.7589, -84.1916],

  "US-TX:Houston": [29.7604, -95.3698],
  "US-TX:Dallas": [32.7767, -96.797],
  "US-TX:Austin": [30.2672, -97.7431],
  "US-TX:San Antonio": [29.4241, -98.4936],
  "US-TX:El Paso": [31.7619, -106.485],

  "US-GA:Atlanta": [33.749, -84.388],
  "US-GA:Sandy Springs": [33.9304, -84.3733],
  "US-GA:Toco Hills": [33.8143, -84.3068],
  "US-GA:Savannah": [32.0809, -81.0912],

  "US-MI:Detroit": [42.3314, -83.0458],
  "US-MI:Oak Park": [42.4595, -83.1827],
  "US-MI:Southfield": [42.4734, -83.2219],
  "US-MI:West Bloomfield": [42.567, -83.3833],
  "US-MI:Ann Arbor": [42.2808, -83.743],

  "US-MO:St. Louis": [38.627, -90.1994],
  "US-MO:Kansas City": [39.0997, -94.5786],
  "US-MO:University City": [38.6631, -90.3095],

  "US-CO:Denver": [39.7392, -104.9903],
  "US-CO:Boulder": [40.015, -105.2705],
  "US-CO:Colorado Springs": [38.8339, -104.8214],

  "US-AZ:Phoenix": [33.4484, -112.074],
  "US-AZ:Scottsdale": [33.4942, -111.9261],
  "US-AZ:Tucson": [32.2226, -110.9747],

  "US-NV:Las Vegas": [36.1699, -115.1398],
  "US-NV:Henderson": [36.0395, -114.9817],
  "US-NV:Reno": [39.5296, -119.8138],

  "US-WA:Seattle": [47.6062, -122.3321],
  "US-WA:Mercer Island": [47.5707, -122.2221],
  "US-WA:Bellevue": [47.6101, -122.2015],

  "US-CT:Stamford": [41.0534, -73.5387],
  "US-CT:West Hartford": [41.7621, -72.742],
  "US-CT:New Haven": [41.3083, -72.9279],
  "US-CT:Waterbury": [41.5581, -73.0515],
  "US-CT:Norwalk": [41.1177, -73.4082],

  "US-MN:Minneapolis": [44.9778, -93.265],
  "US-MN:St. Paul": [44.9537, -93.09],
  "US-MN:St. Louis Park": [44.9483, -93.348],

  "US-WI:Milwaukee": [43.0389, -87.9065],
  "US-WI:Madison": [43.0731, -89.4012],
  "US-WI:Glendale": [43.1281, -87.9256],

  "US-TN:Memphis": [35.1495, -90.049],
  "US-TN:Nashville": [36.1627, -86.7816],
  "US-TN:Knoxville": [35.9606, -83.9207],

  "US-NC:Charlotte": [35.2271, -80.8431],
  "US-NC:Raleigh": [35.7796, -78.6382],
  "US-NC:Durham": [35.994, -78.8986],
  "US-NC:Greensboro": [36.0726, -79.792],

  "US-VA:Richmond": [37.5407, -77.436],
  "US-VA:Norfolk": [36.8508, -76.2859],
  "US-VA:Virginia Beach": [36.8529, -75.978],
  "US-VA:Alexandria": [38.8048, -77.0469],
  "US-VA:Arlington": [38.8816, -77.091],

  "US-DC:Washington": [38.9072, -77.0369],

  "US-IN:Indianapolis": [39.7684, -86.1581],
  "US-IN:South Bend": [41.6764, -86.252],

  "US-KY:Louisville": [38.2527, -85.7585],
  "US-KY:Lexington": [38.0406, -84.5037],

  "US-LA:New Orleans": [29.9511, -90.0715],
  "US-LA:Baton Rouge": [30.4515, -91.1871],

  "US-OR:Portland": [45.5152, -122.6784],
  "US-OR:Eugene": [44.0521, -123.0868],

  "US-RI:Providence": [41.824, -71.4128],

  "US-DE:Wilmington": [39.7391, -75.5398],
  "US-DE:Newark": [39.6837, -75.7497],

  // --- Canada ----------------------------------------------------------
  "CA-ON:Toronto": [43.6532, -79.3832],
  "CA-ON:Thornhill": [43.8161, -79.4237],
  "CA-ON:North York": [43.7615, -79.4111],
  "CA-ON:Ottawa": [45.4215, -75.6972],
  "CA-ON:Hamilton": [43.2557, -79.8711],
  "CA-ON:London": [42.9849, -81.2453],
  "CA-ON:Windsor": [42.3149, -83.0364],

  "CA-QC:Montreal": [45.5019, -73.5674],
  "CA-QC:Côte Saint-Luc": [45.4687, -73.6673],
  "CA-QC:Hampstead": [45.4795, -73.6363],
  "CA-QC:Outremont": [45.5188, -73.6103],
  "CA-QC:Dollard-des-Ormeaux": [45.4939, -73.8244],
  "CA-QC:Quebec City": [46.8139, -71.208],

  "CA-BC:Vancouver": [49.2827, -123.1207],
  "CA-BC:Richmond": [49.1666, -123.1336],
  "CA-BC:Victoria": [48.4284, -123.3656],
  "CA-BC:Burnaby": [49.2488, -122.9805],

  "CA-AB:Calgary": [51.0447, -114.0719],
  "CA-AB:Edmonton": [53.5461, -113.4938],

  "CA-MB:Winnipeg": [49.8951, -97.1384],

  "CA-NS:Halifax": [44.6488, -63.5752],

  // --- Israel ----------------------------------------------------------
  "IL:Jerusalem": [31.7683, 35.2137],
  "IL:Bnei Brak": [32.0809, 34.8338],
  "IL:Tel Aviv": [32.0853, 34.7818],
  "IL:Beit Shemesh": [31.7497, 34.9887],
  "IL:Beitar Illit": [31.6994, 35.1178],
  "IL:Modiin Illit": [31.9328, 35.0428],
  "IL:Ashdod": [31.8014, 34.6435],
  "IL:Netanya": [32.3215, 34.8532],
  "IL:Petah Tikva": [32.087, 34.8882],
  "IL:Rehovot": [31.8928, 34.8113],
  "IL:Haifa": [32.794, 34.9896],
  "IL:Tzfat": [32.9646, 35.496],
  "IL:Tiberias": [32.7922, 35.5312],
  "IL:Elad": [32.0522, 34.952],
  "IL:Ramat Gan": [32.0684, 34.8248],
  "IL:Givat Shmuel": [32.0778, 34.8483],
  "IL:Rishon LeZion": [31.973, 34.8066],
  "IL:Ashkelon": [31.6688, 34.5742],
  "IL:Beer Sheva": [31.253, 34.7915],
  "IL:Efrat": [31.6547, 35.1518],
  "IL:Ma'ale Adumim": [31.7768, 35.2983],
  "IL:Ra'anana": [32.1848, 34.8713],
  "IL:Kfar Saba": [32.175, 34.907],
  "IL:Herzliya": [32.1624, 34.8447],
  "IL:Modiin": [31.8928, 35.0104],
  "IL:Hadera": [32.434, 34.9196],
  "IL:Rechasim": [32.7404, 35.093],
  "IL:Ariel": [32.1057, 35.1875],
  "IL:Kiryat Gat": [31.61, 34.7642],
  "IL:Netivot": [31.4222, 34.5885],
  "IL:Eilat": [29.5577, 34.9519],
  "IL:Zichron Yaakov": [32.5735, 34.9518],

  // --- United Kingdom --------------------------------------------------
  "GB:London": [51.5074, -0.1278],
  "GB:Manchester": [53.4808, -2.2426],
  "GB:Gateshead": [54.9526, -1.6033],
  "GB:Leeds": [53.8008, -1.5491],
  "GB:Liverpool": [53.4084, -2.9916],
  "GB:Glasgow": [55.8642, -4.2518],
  "GB:Birmingham": [52.4862, -1.8904],
  "GB:Brighton": [50.8225, -0.1372],
  "GB:Bournemouth": [50.7192, -1.8808],
  "GB:Edinburgh": [55.9533, -3.1883],
  "GB:Borehamwood": [51.6578, -0.2718],
  "GB:Cardiff": [51.4816, -3.1791],
  "GB:Newcastle": [54.9783, -1.6178],

  // --- France ----------------------------------------------------------
  "FR:Paris": [48.8566, 2.3522],
  "FR:Marseille": [43.2965, 5.3698],
  "FR:Lyon": [45.764, 4.8357],
  "FR:Strasbourg": [48.5734, 7.7521],
  "FR:Toulouse": [43.6047, 1.4442],
  "FR:Nice": [43.7102, 7.262],
  "FR:Sarcelles": [48.9954, 2.3785],
  "FR:Créteil": [48.7904, 2.4556],
  "FR:Villeurbanne": [45.7719, 4.8902],
  "FR:Bordeaux": [44.8378, -0.5792],
  "FR:Grenoble": [45.1885, 5.7245],
  "FR:Aix-en-Provence": [43.5297, 5.4474],
  "FR:Metz": [49.1193, 6.1757],
  "FR:Nancy": [48.6921, 6.1844],
  "FR:Antibes": [43.5808, 7.1251],
};

/**
 * Anchor points for country-level rollups. A country marker doesn't claim
 * to be near anyone in particular — it says "some people, spread across
 * this country" — so it sits at the country's centre rather than at the
 * median of whichever few profiles landed in the bucket.
 */
export const COUNTRY_CENTERS: Record<string, LatLng> = {
  US: [39.5, -98.35],
  CA: [56.13, -106.35],
  IL: [31.5, 34.9],
  GB: [54.0, -2.5],
  FR: [46.6, 2.5],
};

/** Builds the CITY_COORDS key for a stored profile location. */
export function coordKey(
  country: string,
  region: string,
  city: string,
): string {
  return region ? `${country}-${region}:${city}` : `${country}:${city}`;
}

export function coordsFor(
  country: string,
  region: string,
  city: string,
): LatLng | null {
  return CITY_COORDS[coordKey(country, region, city)] ?? null;
}
