import type { TrafficLevel } from '@/lib/tomtom-route-traffic';
import { navigationDistanceMeters } from '@/lib/vector-navigation';

export type RouteLngLat = [number, number];

export type TrafficSectionSpan = {
  startPointIndex: number;
  endPointIndex: number;
  level: TrafficLevel;
};

export type PaintedTrafficSegment = {
  coordinates: RouteLngLat[];
  level: TrafficLevel;
};

export const TRAFFIC_LINE_COLOR: Record<TrafficLevel, string> = {
  clear: '#5EEAD4',
  light: '#E4DE5A',
  moderate: '#F0A83A',
  heavy: '#FF4B55',
};

export const TRAFFIC_GLOW_COLOR: Record<TrafficLevel, string> = {
  clear: '#22D3EE',
  light: '#E8E060',
  moderate: '#F0A83A',
  heavy: '#FF4B55',
};

const SNAP_LIMIT_METERS = 85;

export function classifyTomTomSectionLevel(
  magnitudeOfDelay: number | null | undefined,
  simpleCategory: string | null | undefined,
): TrafficLevel {
  const category = (simpleCategory ?? '').toUpperCase();
  const magnitude = magnitudeOfDelay ?? 0;
  if (category.includes('CLOSURE') || magnitude >= 4) return 'heavy';
  if (magnitude >= 3 || category === 'JAM') return 'heavy';
  if (magnitude >= 2) return 'moderate';
  if (magnitude >= 1) return 'light';
  return 'clear';
}

export function parseTomTomTrafficSections(sections: Array<{
  startPointIndex?: number;
  endPointIndex?: number;
  sectionType?: string;
  simpleCategory?: string;
  magnitudeOfDelay?: number;
}> | null | undefined): TrafficSectionSpan[] {
  if (!Array.isArray(sections)) return [];

  return sections
    .filter((section) => (section.sectionType ?? 'TRAFFIC').toUpperCase() === 'TRAFFIC')
    .map((section) => {
      const startPointIndex = Number(section.startPointIndex);
      const endPointIndex = Number(section.endPointIndex);
      if (!Number.isFinite(startPointIndex) || !Number.isFinite(endPointIndex) || endPointIndex <= startPointIndex) {
        return null;
      }
      return {
        startPointIndex: Math.max(0, Math.round(startPointIndex)),
        endPointIndex: Math.max(0, Math.round(endPointIndex)),
        level: classifyTomTomSectionLevel(section.magnitudeOfDelay, section.simpleCategory ?? null),
      };
    })
    .filter((section): section is TrafficSectionSpan => section !== null);
}

function nearestTomTomIndex(
  coordinate: RouteLngLat,
  tomtomPoints: Array<{ lat: number; lng: number }>,
) {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < tomtomPoints.length; index += 1) {
    const point = tomtomPoints[index];
    const distance = navigationDistanceMeters(
      { lat: coordinate[1], lng: coordinate[0] },
      { lat: point.lat, lng: point.lng },
    );
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }
  return { index: bestIndex, distance: bestDistance };
}

function sectionLevelAt(index: number, sections: TrafficSectionSpan[]): TrafficLevel {
  for (const section of sections) {
    if (index >= section.startPointIndex && index <= section.endPointIndex) return section.level;
  }
  return 'clear';
}

export function paintRouteWithLiveTraffic({
  route,
  live,
  overallLevel,
  tomtomPoints,
  sections,
}: {
  route: RouteLngLat[];
  live: boolean;
  overallLevel?: TrafficLevel | null;
  tomtomPoints?: Array<{ lat: number; lng: number }> | null;
  sections?: TrafficSectionSpan[] | null;
}): PaintedTrafficSegment[] {
  if (route.length < 2) return [];

  if (!live) {
    return [{ coordinates: route, level: 'clear' }];
  }

  if (!tomtomPoints || tomtomPoints.length < 2 || !sections || sections.length === 0) {
    return [{ coordinates: route, level: overallLevel ?? 'clear' }];
  }

  const vertexLevels = route.map((coordinate) => {
    const match = nearestTomTomIndex(coordinate, tomtomPoints);
    if (match.distance > SNAP_LIMIT_METERS) return 'clear' as TrafficLevel;
    return sectionLevelAt(match.index, sections);
  });

  const segments: PaintedTrafficSegment[] = [];
  let start = 0;
  for (let index = 1; index <= vertexLevels.length; index += 1) {
    if (index < vertexLevels.length && vertexLevels[index] === vertexLevels[start]) continue;
    const coordinates = route.slice(start, index);
    if (index < route.length) coordinates.push(route[index]);
    if (coordinates.length >= 2) {
      segments.push({ coordinates, level: vertexLevels[start] });
    }
    start = index;
  }

  return segments;
}
