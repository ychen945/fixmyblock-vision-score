export interface Neighborhood {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  needScore: number;
}

export const CHICAGO_NEIGHBORHOODS: readonly Neighborhood[] = [
  { slug: "loop", name: "Loop", lat: 41.8781, lng: -87.6298, needScore: 45 },
  { slug: "river-north", name: "River North", lat: 41.8906, lng: -87.6336, needScore: 32 },
  { slug: "lincoln-park", name: "Lincoln Park", lat: 41.9217, lng: -87.6489, needScore: 28 },
  { slug: "wicker-park", name: "Wicker Park", lat: 41.9096, lng: -87.6773, needScore: 38 },
  { slug: "logan-square", name: "Logan Square", lat: 41.9289, lng: -87.7054, needScore: 52 },
  { slug: "bucktown", name: "Bucktown", lat: 41.9196, lng: -87.6810, needScore: 35 },
  { slug: "pilsen", name: "Pilsen", lat: 41.8564, lng: -87.6598, needScore: 68 },
  { slug: "hyde-park", name: "Hyde Park", lat: 41.7943, lng: -87.5907, needScore: 41 },
  { slug: "wrigleyville", name: "Wrigleyville", lat: 41.9484, lng: -87.6553, needScore: 29 },
  { slug: "gold-coast", name: "Gold Coast", lat: 41.9029, lng: -87.6278, needScore: 22 },
  { slug: "south-loop", name: "South Loop", lat: 41.8686, lng: -87.6270, needScore: 48 },
  { slug: "west-loop", name: "West Loop", lat: 41.8825, lng: -87.6470, needScore: 36 },
  { slug: "bronzeville", name: "Bronzeville", lat: 41.8184, lng: -87.6159, needScore: 71 },
  { slug: "uptown", name: "Uptown", lat: 41.9658, lng: -87.6564, needScore: 55 },
  { slug: "andersonville", name: "Andersonville", lat: 41.9797, lng: -87.6686, needScore: 31 },
  { slug: "old-town", name: "Old Town", lat: 41.9120, lng: -87.6348, needScore: 26 },
  { slug: "streeterville", name: "Streeterville", lat: 41.8920, lng: -87.6198, needScore: 24 },
  { slug: "chinatown", name: "Chinatown", lat: 41.8528, lng: -87.6325, needScore: 58 },
] as const;

export function getNeighborhoodBySlug(slug: string): Neighborhood | undefined {
  return CHICAGO_NEIGHBORHOODS.find((n) => n.slug === slug);
}

export function getNeighborhoodBounds(neighborhood: Neighborhood) {
  // Approximate bounds (roughly 0.02 degrees ~1.2 miles in each direction)
  const offset = 0.02;
  return {
    north: neighborhood.lat + offset,
    south: neighborhood.lat - offset,
    east: neighborhood.lng + offset,
    west: neighborhood.lng - offset,
  };
}
