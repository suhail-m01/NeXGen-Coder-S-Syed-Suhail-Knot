import { writeFile } from 'node:fs/promises';

const names = [
  'Koramangala', 'Indiranagar', 'HSR Layout', 'Whitefield', 'Electronic City',
  'Jayanagar', 'JP Nagar', 'Malleshwaram', 'Hebbal', 'Marathahalli',
  'BTM Layout', 'Banashankari', 'Rajajinagar', 'MG Road', 'Yelahanka',
  'Bellandur', 'Sarjapur Road', 'Domlur', 'Ulsoor', 'Frazer Town',
  'RT Nagar', 'Vijayanagar', 'Basavanagudi', 'Richmond Town', 'Cox Town',
  'Kalyan Nagar', 'Hennur', 'Thanisandra', 'Mahadevapura', 'Brookefield',
  'Hoodi', 'KR Puram', 'Banaswadi', 'Kammanahalli', 'Sahakara Nagar',
  'Sanjaynagar', 'Peenya', 'Nagarbhavi', 'Kengeri', 'Devanahalli',
];

type NominatimResult = {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type: string;
  boundingbox: [string, string, string, string];
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const output: unknown[] = [];

for (const [index, name] of names.entries()) {
  const query = encodeURIComponent(`${name}, Bengaluru, Karnataka, India`);
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&q=${query}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'KnotProduct/0.1 (local event-discovery development)',
      Accept: 'application/json',
    },
  });
  if (!response.ok) throw new Error(`Nominatim ${response.status} for ${name}`);
  const results = (await response.json()) as NominatimResult[];
  if (!results[0]) throw new Error(`No geocoding result for ${name}`);
  const result = results[0];
  const latitude = Number(result.lat);
  const longitude = Number(result.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error(`Invalid coordinates for ${name}`);
  }
  output.push({
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name,
    aliases: [],
    city: 'Bengaluru',
    country: 'IN',
    latitude,
    longitude,
    geocode: {
      source: 'OpenStreetMap Nominatim',
      osmPlaceId: result.place_id,
      displayName: result.display_name,
      resultType: result.type,
      boundingBox: result.boundingbox.map(Number),
      geocodedAt: new Date().toISOString(),
    },
  });
  console.log(`${index + 1}/${names.length}: ${name} → ${latitude}, ${longitude}`);
  if (index < names.length - 1) await sleep(1100);
}

await writeFile(
  new URL('../src/domain/localities.json', import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);
console.log(`Wrote ${output.length} geocoded localities.`);
