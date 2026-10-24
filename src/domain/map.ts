export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface MapViewport extends GeoPoint {
  span: number;
}

export function pointInViewport(point: GeoPoint, viewport: MapViewport) {
  const longitudeSpan = viewport.span * 1.35;
  return Math.abs(point.latitude - viewport.latitude) <= viewport.span / 2 &&
    Math.abs(point.longitude - viewport.longitude) <= longitudeSpan / 2;
}

/** Bounded grid clustering avoids one DOM marker per overlapping event. */
export function clusterByGrid<T>(items: T[], coordinates: (item: T) => GeoPoint, cellDegrees: number) {
  const safeCell = Math.max(0.001, cellDegrees);
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const point = coordinates(item);
    // Decimal coordinates such as 77.6 / 0.1 can land infinitesimally below an integer.
    const key = `${Math.floor(point.latitude / safeCell + 1e-9)}:${Math.floor(point.longitude / safeCell + 1e-9)}`;
    buckets.set(key, [...(buckets.get(key) ?? []), item]);
  }
  return [...buckets.values()];
}
