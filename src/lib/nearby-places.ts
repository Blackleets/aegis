export type NearbyPlaceCategory =
  | 'fuel'
  | 'restaurant'
  | 'hospital'
  | 'pharmacy'
  | 'parking'
  | 'charging_station';

export type NearbyPlace = {
  id: string;
  name: string;
  category: NearbyPlaceCategory;
  lat: number;
  lng: number;
  brand?: string;
  openingHours?: string;
  source: 'OpenStreetMap';
};

export const NEARBY_PLACE_META: Record<NearbyPlaceCategory, { label: string; icon: string; color: string }> = {
  fuel: { label: 'Gasolinera', icon: '⛽', color: '#38BDF8' },
  restaurant: { label: 'Restaurante', icon: '🍴', color: '#FB923C' },
  hospital: { label: 'Hospital', icon: '✚', color: '#FB7185' },
  pharmacy: { label: 'Farmacia', icon: '✚', color: '#4ADE80' },
  parking: { label: 'Aparcamiento', icon: 'P', color: '#60A5FA' },
  charging_station: { label: 'Cargador', icon: '⚡', color: '#2DD4BF' },
};
