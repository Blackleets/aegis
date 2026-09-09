import { describe, expect, it } from 'vitest';

import {
  classifyTomTomSectionLevel,
  paintRouteWithLiveTraffic,
  parseTomTomTrafficSections,
} from '../src/lib/route-traffic-paint';

const route: Array<[number, number]> = [
  [-3.7040, 40.4168],
  [-3.7030, 40.4168],
  [-3.7020, 40.4168],
  [-3.7010, 40.4168],
];

describe('route traffic paint', () => {
  it('never invents congestion when TomTom is not live', () => {
    expect(paintRouteWithLiveTraffic({
      route,
      live: false,
      overallLevel: 'heavy',
      tomtomPoints: [{ lat: 40.4168, lng: -3.7030 }],
      sections: [{ startPointIndex: 0, endPointIndex: 3, level: 'heavy' }],
    })).toEqual([{ coordinates: route, level: 'clear' }]);
  });

  it('uses the live summary color when TomTom has no traffic sections', () => {
    expect(paintRouteWithLiveTraffic({
      route,
      live: true,
      overallLevel: 'moderate',
      tomtomPoints: [],
      sections: [],
    })).toEqual([{ coordinates: route, level: 'moderate' }]);
  });

  it('paints only the TomTom traffic spans that actually sit on our route', () => {
    const painted = paintRouteWithLiveTraffic({
      route,
      live: true,
      overallLevel: 'clear',
      tomtomPoints: [
        { lat: 40.4168, lng: -3.7040 },
        { lat: 40.4168, lng: -3.7030 },
        { lat: 40.4168, lng: -3.7020 },
        { lat: 40.4168, lng: -3.7010 },
      ],
      sections: [{ startPointIndex: 2, endPointIndex: 3, level: 'heavy' }],
    });

    expect(painted.some((segment) => segment.level === 'heavy')).toBe(true);
    expect(painted.some((segment) => segment.level === 'clear')).toBe(true);
  });

  it('keeps far-away TomTom jams off our route instead of guessing', () => {
    const painted = paintRouteWithLiveTraffic({
      route,
      live: true,
      overallLevel: 'clear',
      tomtomPoints: [
        { lat: 40.4300, lng: -3.6900 },
        { lat: 40.4310, lng: -3.6890 },
      ],
      sections: [{ startPointIndex: 0, endPointIndex: 1, level: 'heavy' }],
    });

    expect(painted).toEqual([{ coordinates: route, level: 'clear' }]);
  });

  it('classifies TomTom section magnitudes without inventing delay', () => {
    expect(classifyTomTomSectionLevel(0, 'OTHER')).toBe('clear');
    expect(classifyTomTomSectionLevel(1, 'OTHER')).toBe('light');
    expect(classifyTomTomSectionLevel(2, 'OTHER')).toBe('moderate');
    expect(classifyTomTomSectionLevel(3, 'JAM')).toBe('heavy');
    expect(parseTomTomTrafficSections([
      { startPointIndex: 0, endPointIndex: 4, sectionType: 'TRAFFIC', magnitudeOfDelay: 2 },
      { startPointIndex: 4, endPointIndex: 4, sectionType: 'TRAFFIC', magnitudeOfDelay: 3 },
    ])).toEqual([{ startPointIndex: 0, endPointIndex: 4, level: 'moderate' }]);
  });
});
