export const MAJOR_INDIAN_CITIES = [
  'Bengaluru', 'Mumbai', 'Delhi NCR', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata',
  'Ahmedabad', 'Jaipur', 'Kochi', 'Coimbatore', 'Indore', 'Bhubaneswar',
  'Chandigarh', 'Noida', 'Gurugram', 'Thiruvananthapuram', 'Visakhapatnam',
] as const;

const THEMES = ['AI', 'fintech', 'climate tech', 'health tech', 'open source', 'web3', 'cybersecurity'] as const;

export function buildDiscoveryQueries(now = new Date(), requestedCities: string[] = [], cap = 72): string[] {
  const cities = [...new Set([...requestedCities, ...MAJOR_INDIAN_CITIES, 'Online'].map((city) => city.trim()).filter(Boolean))];
  const months = [0, 1, 2].map((offset) => new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1))));
  const queries: string[] = [];
  for (const city of cities) {
    queries.push(`hackathon ${city} ${months[0]}`);
    queries.push(`${city} hackathon free`);
    queries.push(`college hackathon ${city}`);
    if (city === 'Online') queries.push(`online hackathon ${now.getUTCFullYear()}`);
  }
  for (const city of cities.slice(0, 8)) {
    for (const month of months.slice(1)) queries.push(`hackathon ${city} ${month}`);
  }
  for (const theme of THEMES) queries.push(`${theme} hackathon India ${now.getUTCFullYear()}`);
  return [...new Set(queries)].slice(0, Math.max(1, cap));
}
