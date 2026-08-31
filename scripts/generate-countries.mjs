import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TA_NAMES = {
  India: "இந்தியா",
  "Sri Lanka": "இலங்கை",
  Singapore: "சிங்கப்பூர்",
  Malaysia: "மலேசியா",
  "United States": "அமெரிக்கா",
  "United Kingdom": "இங்கிலாந்து",
  Australia: "ஆஸ்திரேலியா",
  Canada: "கனடா",
  Japan: "ஜப்பான்",
  China: "சீனா",
  France: "பிரான்ஸ்",
  Germany: "ஜெர்மனி",
  Russia: "ரஷ்யா",
  Brazil: "பிரேசில்",
  "United Arab Emirates": "ஐக்கிய அரபு எமிரேட்ஸ்",
  "Saudi Arabia": "சவூதி அரேபியா",
  Pakistan: "பாகிஸ்தான்",
  Bangladesh: "வங்காளதேசம்",
  Nepal: "நேபாளம்",
  Myanmar: "மியான்மர்",
  Thailand: "தாய்லாந்து",
  Indonesia: "இந்தோனேசியா",
  "South Africa": "தென் ஆப்பிரிக்கா",
  "New Zealand": "நியூசிலாந்து",
};

function fetch(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });
}

const raw = await fetch(
  "https://raw.githubusercontent.com/Stefie/geojson-world/master/capitals.geojson",
);
const geo = JSON.parse(raw);
const countries = geo.features
  .map((feature) => {
    const [lng, lat] = feature.geometry.coordinates;
    const country = feature.properties.country;
    const id = feature.properties.iso2.toLowerCase();
    return {
      id,
      nameEn: country,
      nameTa: TA_NAMES[country] ?? country,
      capital: feature.properties.city || country,
      lat: Math.round(lat * 10000) / 10000,
      lng: Math.round(lng * 10000) / 10000,
    };
  })
  .sort((a, b) => a.nameEn.localeCompare(b.nameEn));

const india = countries.find((country) => country.id === "in");
if (india) {
  india.capital = "Chennai";
  india.lat = 13.0827;
  india.lng = 80.2707;
}

const fileBody = `export interface Country {
  id: string;
  nameEn: string;
  nameTa: string;
  capital: string;
  lat: number;
  lng: number;
}

/** ISO 3166-1 alpha-2 country list with capital coordinates for sunrise. */
export const COUNTRIES: Country[] = ${JSON.stringify(countries, null, 2)};

export const DEFAULT_COUNTRY_ID = "in";

export function getCountry(id: string): Country {
  return (
    COUNTRIES.find((country) => country.id === id) ??
    COUNTRIES.find((country) => country.id === DEFAULT_COUNTRY_ID)!
  );
}

export function findCountryByName(query: string): Country | undefined {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return undefined;
  return COUNTRIES.find(
    (country) =>
      country.id === normalized ||
      country.nameEn.toLowerCase() === normalized ||
      country.nameTa === query.trim() ||
      country.capital.toLowerCase() === normalized,
  );
}

export function searchCountries(query: string, limit = 20): Country[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return COUNTRIES.slice(0, limit);
  return COUNTRIES.filter(
    (country) =>
      country.nameEn.toLowerCase().includes(normalized) ||
      country.nameTa.includes(query.trim()) ||
      country.capital.toLowerCase().includes(normalized) ||
      country.id === normalized,
  ).slice(0, limit);
}
`;

const outPath = path.join(__dirname, "..", "src", "data", "countries.ts");
fs.writeFileSync(outPath, fileBody);
const stat = fs.statSync(outPath);
console.log(`Wrote ${countries.length} countries (${Math.round(stat.size / 1024)} KB)`);
