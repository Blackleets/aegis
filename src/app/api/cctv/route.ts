import { NextResponse } from 'next/server';
import { stealthFetch } from '@/lib/stealthFetch';
import { fetchAsfinagCameras } from './asfinag';
import { fetchBulgariaCameras } from './bulgaria';
import { fetchGreeceCameras } from './greece';
import { fetchSerbiaCameras } from './serbia';
import { fetchMacedoniaCameras } from './macedonia';
import { fetchTurkeyCameras } from './turkey';
import { fetchRomaniaCameras } from './romania';
import { fetchAustraliaCameras } from './australia';
import { fetchItalyCameras } from './italy';
import { fetchCzechiaCameras } from './czechia';
import { fetchSlovakiaCameras } from './slovakia';
import { fetchGermanyCameras } from './germany';
import { fetchFranceCameras } from './france';
import { fetchSpainCameras } from './spain';
import { fetchPolandCameras } from './poland';
import { fetchJapanCameras } from './japan';

/**
 * OSIRIS — Worldwide CCTV Camera API v2
 * Viewport-aware: pass ?region=xx to load cameras for specific regions
 * Supports: uk, us-east, us-west, us-central, canada, europe, asia
 * Or pass ?lat=x&lng=y&radius=5 for proximity-based loading
 */

interface CameraRecord {
  id: string;
  lat: number;
  lng: number;
  name: string;
  city: string;
  country: string;
  feed_url?: string;
  external_url?: string;
  source: string;
}

interface TfLProperty {
  key?: string;
  value?: string;
}

interface TfLCamera {
  id?: string;
  lat?: number;
  lon?: number;
  commonName?: string;
  additionalProperties?: TfLProperty[];
}

interface WsdotCamera {
  CameraID?: string | number;
  CameraLocation?: { Latitude?: number; Longitude?: number };
  Title?: string;
  ImageURL?: string;
}

interface CaltransCamera {
  location?: { latitude?: string; longitude?: string; locationName?: string };
  cctv?: { imageData?: { static?: { currentImageURL?: string } } };
}

interface OntarioCamera {
  id?: string | number;
  latitude?: number;
  longitude?: number;
  description?: string;
  name?: string;
  imageUrl?: string;
  url?: string;
}

interface MontrealCamera {
  latitude?: number;
  lat?: number;
  longitude?: number;
  lng?: number;
  description?: string;
  name?: string;
  url?: string;
  imageUrl?: string;
}

interface AlbertaCamera {
  Id?: string | number;
  Latitude?: number;
  Longitude?: number;
  Location?: string;
  Views?: Array<{ Url?: string }>;
}

interface IdotCamera {
  latitude?: number;
  longitude?: number;
  cameraName?: string;
  description?: string;
  imageUrl?: string;
  url?: string;
}

interface FloridaCamera {
  latitude?: number;
  longitude?: number;
  description?: string;
  imageUrl?: string;
}

interface NetherlandsCamera {
  lat?: number;
  lng?: number;
  name?: string;
  imageUrl?: string;
}

interface SingaporeCamera {
  camera_id?: string;
  image?: string;
  location?: { latitude?: number; longitude?: number };
}

type RegionFetcher = () => Promise<CameraRecord[]>;

function hasCoordinates(camera: Partial<CameraRecord>): camera is CameraRecord {
  return Number.isFinite(camera.lat) && Number.isFinite(camera.lng) && Boolean(camera.id) && Boolean(camera.name) && Boolean(camera.city) && Boolean(camera.country) && Boolean(camera.source);
}

function parseCoordinate(value: string | number | undefined): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

// ── UK: Transport for London JamCams (~900) ──
async function fetchTfLCameras(): Promise<CameraRecord[]> {
  try {
    const res = await stealthFetch('https://api.tfl.gov.uk/Place/Type/JamCam', { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return [];
    const data = asArray<TfLCamera>(await res.json());
    return data
      .map((cam) => {
        const imgProp = cam.additionalProperties?.find((property) => property.key === 'imageUrl');
        const camId = cam.id?.replace('JamCams_', '') || '';
        return {
          id: `tfl-${cam.id || camId}`,
          lat: cam.lat ?? NaN,
          lng: cam.lon ?? NaN,
          name: cam.commonName || 'London JamCam',
          city: 'London',
          country: 'UK',
          feed_url: imgProp?.value || `https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/${camId}.jpg`,
          source: 'TfL',
        } satisfies Partial<CameraRecord>;
      })
      .filter(hasCoordinates);
  } catch {
    return [];
  }
}

// ── US-WEST: WSDOT Washington State (~500) ──
async function fetchWSDOTCameras(): Promise<CameraRecord[]> {
  try {
    const res = await stealthFetch('https://data.wsdot.wa.gov/log/public/cameras.json', { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const data = asArray<WsdotCamera>(await res.json());
    return data
      .map((cam) => ({
        id: `wsdot-${cam.CameraID ?? 'unknown'}`,
        lat: cam.CameraLocation?.Latitude ?? NaN,
        lng: cam.CameraLocation?.Longitude ?? NaN,
        name: cam.Title || 'WSDOT Camera',
        city: 'Washington',
        country: 'US',
        feed_url: cam.ImageURL || '',
        source: 'WSDOT',
      } satisfies Partial<CameraRecord>))
      .filter((camera) => hasCoordinates(camera) && Boolean(camera.feed_url));
  } catch {
    return [];
  }
}

// ── US-WEST: Caltrans California Districts ──
async function fetchCaltransCameras(): Promise<CameraRecord[]> {
  const allCams: CameraRecord[] = [];
  for (const dist of ['d03', 'd04', 'd05', 'd06', 'd07', 'd08', 'd10', 'd11', 'd12']) {
    try {
      const res = await stealthFetch(`https://cwwp2.dot.ca.gov/data/${dist}/cctv/cctvStatus${dist.toUpperCase()}.json`, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const data = await res.json() as { data?: CaltransCamera[] };
      for (const cam of asArray<CaltransCamera>(data.data)) {
        const lat = parseCoordinate(cam.location?.latitude);
        const lng = parseCoordinate(cam.location?.longitude);
        const url = cam.cctv?.imageData?.static?.currentImageURL;
        if (lat === null || lng === null || !url) continue;
        allCams.push({
          id: `cal-${allCams.length}`,
          lat,
          lng,
          name: cam.location?.locationName || 'Caltrans',
          city: 'California',
          country: 'US',
          feed_url: url,
          source: 'Caltrans',
        });
      }
    } catch {
      // silent
    }
  }
  return allCams;
}

// ── CANADA: Ottawa, Toronto, Montreal ──
async function fetchCanadaCameras(): Promise<CameraRecord[]> {
  const cams: CameraRecord[] = [];

  try {
    const res = await stealthFetch('https://511on.ca/api/v2/get/cameras', { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const data = asArray<OntarioCamera>(await res.json());
      for (const cam of data) {
        if (!cam.latitude || !cam.longitude) continue;
        cams.push({
          id: `on-${cam.id ?? cams.length}`,
          lat: cam.latitude,
          lng: cam.longitude,
          name: cam.description || cam.name || 'Ontario Camera',
          city: 'Ontario',
          country: 'Canada',
          feed_url: cam.imageUrl || cam.url || '',
          source: '511 Ontario',
        });
      }
    }
  } catch {
    // silent
  }

  try {
    const res = await stealthFetch('https://ville.montreal.qc.ca/circulation/sites/ville.montreal.qc.ca.circulation/files/cameras.json', { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const data = asArray<MontrealCamera>(await res.json());
      for (const cam of data) {
        const lat = cam.latitude ?? cam.lat;
        const lng = cam.longitude ?? cam.lng;
        if (!lat || !lng) continue;
        cams.push({
          id: `mtl-${cams.length}`,
          lat,
          lng,
          name: cam.description || cam.name || 'Montréal Camera',
          city: 'Montréal',
          country: 'Canada',
          feed_url: cam.url || cam.imageUrl || '',
          source: 'Ville MTL',
        });
      }
    }
  } catch {
    // silent
  }

  const curated: CameraRecord[] = [
    { id: 'ott-1', lat: 45.4215, lng: -75.6972, name: 'Parliament Hill / Wellington', city: 'Ottawa', country: 'Canada', feed_url: 'https://traffic.ottawa.ca/map/camera?id=1', source: 'Ottawa' },
    { id: 'ott-2', lat: 45.4231, lng: -75.6831, name: 'Rideau / Sussex', city: 'Ottawa', country: 'Canada', feed_url: 'https://traffic.ottawa.ca/map/camera?id=2', source: 'Ottawa' },
    { id: 'ott-3', lat: 45.4195, lng: -75.7009, name: 'Bank / Sparks', city: 'Ottawa', country: 'Canada', feed_url: 'https://traffic.ottawa.ca/map/camera?id=3', source: 'Ottawa' },
    { id: 'ott-4', lat: 45.4249, lng: -75.695, name: 'King Edward / Rideau', city: 'Ottawa', country: 'Canada', feed_url: 'https://traffic.ottawa.ca/map/camera?id=4', source: 'Ottawa' },
    { id: 'ott-5', lat: 45.3968, lng: -75.7398, name: 'Merivale / Baseline', city: 'Ottawa', country: 'Canada', feed_url: 'https://traffic.ottawa.ca/map/camera?id=5', source: 'Ottawa' },
    { id: 'ott-6', lat: 45.3484, lng: -75.758, name: 'Fallowfield / Woodroffe', city: 'Ottawa', country: 'Canada', feed_url: 'https://traffic.ottawa.ca/map/camera?id=6', source: 'Ottawa' },
    { id: 'ott-7', lat: 45.4012, lng: -75.6518, name: 'Hwy 417 / Vanier Pkwy', city: 'Ottawa', country: 'Canada', feed_url: 'https://traffic.ottawa.ca/map/camera?id=7', source: 'Ottawa' },
    { id: 'ott-8', lat: 45.4475, lng: -75.4822, name: 'Innes / Orleans Blvd', city: 'Ottawa', country: 'Canada', feed_url: 'https://traffic.ottawa.ca/map/camera?id=8', source: 'Ottawa' },
    { id: 'tor-1', lat: 43.6532, lng: -79.3832, name: 'Yonge / Dundas Square', city: 'Toronto', country: 'Canada', feed_url: 'https://511on.ca/api/v2/get/cameras', source: '511 Ontario' },
    { id: 'tor-2', lat: 43.6426, lng: -79.3871, name: 'CN Tower / Lakeshore', city: 'Toronto', country: 'Canada', feed_url: 'https://511on.ca/api/v2/get/cameras', source: '511 Ontario' },
    { id: 'tor-3', lat: 43.6711, lng: -79.3868, name: 'Bloor / Yonge', city: 'Toronto', country: 'Canada', feed_url: 'https://511on.ca/api/v2/get/cameras', source: '511 Ontario' },
  ];
  cams.push(...curated);

  try {
    const res = await stealthFetch('https://511.alberta.ca/api/v2/get/cameras', { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const data = asArray<AlbertaCamera>(await res.json());
      for (const cam of data) {
        const url = cam.Views?.[0]?.Url;
        if (!cam.Latitude || !cam.Longitude || !url) continue;
        cams.push({
          id: `ab-${cam.Id ?? cams.length}`,
          lat: cam.Latitude,
          lng: cam.Longitude,
          name: cam.Location || 'Alberta Camera',
          city: 'Alberta',
          country: 'Canada',
          feed_url: url,
          source: 'Alberta 511',
        });
      }
    }
  } catch {
    // silent
  }

  return cams.filter(hasCoordinates);
}

// ── US-CENTRAL: Chicago, Houston, Dallas, Denver ──
async function fetchUSCentralCameras(): Promise<CameraRecord[]> {
  const cams: CameraRecord[] = [];
  try {
    const res = await stealthFetch('https://www.travelmidwest.com/lmiga/cameraReport.json', { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const data = await res.json() as { cameraReports?: IdotCamera[] } | IdotCamera[];
      const reports = Array.isArray(data) ? data : asArray<IdotCamera>(data.cameraReports);
      for (const cam of reports.slice(0, 800)) {
        if (!cam.latitude || !cam.longitude) continue;
        cams.push({
          id: `ildot-${cams.length}`,
          lat: cam.latitude,
          lng: cam.longitude,
          name: cam.cameraName || cam.description || 'IDOT Camera',
          city: 'Illinois',
          country: 'US',
          feed_url: cam.imageUrl || cam.url || '',
          source: 'IDOT',
        });
      }
    }
  } catch {
    // silent
  }

  return cams.filter(hasCoordinates);
}

// ── US-EAST: OH, DC, Florida, Georgia ──
async function fetchUSEastCameras(): Promise<CameraRecord[]> {
  const cams: CameraRecord[] = [
    {
      id: 'butler-oh-hamilton', lat: 39.3988617, lng: -84.5595353,
      name: 'Hamilton, OH', city: 'Hamilton', country: 'US',
      feed_url: 'https://gsccam.butlersheriff.org/axis-cgi/jpg/image.cgi',
      external_url: 'https://gsccam.butlersheriff.org/camera/index.html#/video',
      source: 'Butler County, OH',
    },
    {
      id: 'butler-oh-129-747', lat: 39.381435, lng: -84.438423,
      name: 'OH-129 at 747', city: 'Butler County', country: 'US',
      feed_url: 'https://towercam.butlersheriff.org/axis-cgi/jpg/image.cgi',
      external_url: 'https://towercam.butlersheriff.org/aca/index.html#view',
      source: 'Butler County, OH',
    },
    {
      id: 'cincinnati-cincyvision-yt', lat: 39.089101, lng: -84.527943,
      name: 'CincyVision YT', city: 'Cincinnati', country: 'US',
      external_url: 'https://www.youtube.com/@AaronPreslin/live',
      source: 'Cincinnati, OH',
    },
    {
      id: 'cincinnati-covington-earthcam', lat: 39.09051, lng: -84.510413,
      name: 'Cincinnati-Covington EarthCam', city: 'Covington', country: 'US',
      external_url: 'https://www.earthcam.com/usa/kentucky/covington/?cam=covington',
      source: 'Cincinnati, OH',
    },
  ];

  try {
    const res = await stealthFetch('https://fl511.com/api/v2/cameras', { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const data = asArray<FloridaCamera>(await res.json());
      for (const cam of data.slice(0, 800)) {
        if (!cam.latitude || !cam.longitude) continue;
        cams.push({
          id: `fl-${cams.length}`,
          lat: cam.latitude,
          lng: cam.longitude,
          name: cam.description || 'FL-511 Camera',
          city: 'Florida',
          country: 'US',
          feed_url: cam.imageUrl || '',
          source: 'FL-511',
        });
      }
    }
  } catch {
    // silent
  }

  return cams.filter(hasCoordinates);
}

// ── EUROPE: Netherlands, Germany, France ──
async function fetchEuropeCameras(): Promise<CameraRecord[]> {
  const cams: CameraRecord[] = [];

  try {
    const res = await stealthFetch('https://opendata.ndw.nu/cameras.json', { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const data = asArray<NetherlandsCamera>(await res.json());
      for (const cam of data.slice(0, 1000)) {
        if (!cam.lat || !cam.lng) continue;
        cams.push({
          id: `nl-${cams.length}`,
          lat: cam.lat,
          lng: cam.lng,
          name: cam.name || 'NL Camera',
          city: 'Netherlands',
          country: 'NL',
          feed_url: cam.imageUrl || '',
          source: 'RWS',
        });
      }
    }
  } catch {
    // silent
  }

  cams.push(...await fetchAsfinagCameras() as CameraRecord[]);
  return cams.filter(hasCoordinates);
}

// ── ASIA/PACIFIC ──
async function fetchAsiaCameras(): Promise<CameraRecord[]> {
  const cams: CameraRecord[] = [];

  try {
    const res = await stealthFetch('https://api.data.gov.sg/v1/transport/traffic-images', { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const data = await res.json() as { items?: Array<{ cameras?: SingaporeCamera[] }> };
      const items = data.items?.[0]?.cameras || [];
      for (const cam of items) {
        if (!cam.location?.latitude || !cam.location?.longitude || !cam.image) continue;
        cams.push({
          id: `sin-${cam.camera_id || cams.length}`,
          lat: cam.location.latitude,
          lng: cam.location.longitude,
          name: `Camera ${cam.camera_id || cams.length}`,
          city: 'Singapore',
          country: 'Singapore',
          feed_url: cam.image,
          source: 'LTA Singapore',
        });
      }
    }
  } catch {
    // silent
  }

  return cams;
}

const REGION_FETCHERS: Record<string, RegionFetcher> = {
  uk: fetchTfLCameras,
  'us-west': async () => [...await fetchWSDOTCameras(), ...await fetchCaltransCameras()],
  'us-east': fetchUSEastCameras,
  'us-central': fetchUSCentralCameras,
  canada: fetchCanadaCameras,
  europe: fetchEuropeCameras,
  asia: fetchAsiaCameras,
  bulgaria: fetchBulgariaCameras,
  greece: fetchGreeceCameras,
  serbia: fetchSerbiaCameras,
  macedonia: fetchMacedoniaCameras,
  turkey: fetchTurkeyCameras,
  romania: fetchRomaniaCameras,
  australia: fetchAustraliaCameras,
  italy: fetchItalyCameras,
  czechia: fetchCzechiaCameras,
  slovakia: fetchSlovakiaCameras,
  germany: fetchGermanyCameras,
  france: fetchFranceCameras,
  spain: fetchSpainCameras,
  poland: fetchPolandCameras,
  japan: fetchJapanCameras,
};

function getRegionsForBounds(lat: number, lng: number): string[] {
  const regions: string[] = [];

  if (lat > 49 && lat < 61 && lng > -8 && lng < 2) regions.push('uk');
  if (lat > 24 && lat < 49 && lng > -85 && lng < -66) regions.push('us-east');

  if (lat > 24 && lat < 49 && lng > -105 && lng < -80) regions.push('us-central');
  if (lat > 42 && lat < 70 && lng > -141 && lng < -52) regions.push('canada');

  const inBulgaria = lat > 41 && lat < 44.5 && lng > 22 && lng < 29.5;
  const inGreece = lat > 34.5 && lat < 41.8 && lng > 19 && lng < 30;
  const inSerbia = lat > 42 && lat < 46.5 && lng > 18.8 && lng < 23.3;
  const inMacedonia = lat > 40.8 && lat < 42.8 && lng > 20.4 && lng < 23.2;
  const inRomania = lat > 43.5 && lat < 48.5 && lng > 20 && lng < 29.8;
  const inTurkey = lat > 35.5 && lat < 42.5 && lng > 25.5 && lng < 45;
  const inItaly = lat > 36 && lat < 47.5 && lng > 6.5 && lng < 18.5;
  const inCzechia = lat > 48.5 && lat < 51.1 && lng > 12 && lng < 18.9;
  const inSlovakia = lat > 47.7 && lat < 49.6 && lng > 16.8 && lng < 22.6;
  const inGermany = lat > 47 && lat < 55.1 && lng > 5.8 && lng < 15.1;
  const inFrance = lat > 42.3 && lat < 51.1 && lng > -5 && lng < 8.3;
  const inSpain = lat > 27 && lat < 43.8 && lng > -18.2 && lng < 4.4;
  const inPoland = lat > 49 && lat < 54.8 && lng > 14.1 && lng < 24.1;
  const inBalkans = inBulgaria || inGreece || inSerbia || inMacedonia || inRomania || inTurkey;
  const inWesternEurope = inItaly || inCzechia || inSlovakia || inGermany || inFrance || inSpain || inPoland;

  if (lat > 35 && lat < 72 && lng > -11 && lng < 40 && !inBalkans && !inWesternEurope) {
    regions.push('europe');
  }
  if (inBulgaria) regions.push('bulgaria');
  if (inGreece) regions.push('greece');
  if (inSerbia) regions.push('serbia');
  if (inMacedonia) regions.push('macedonia');
  if (inRomania) regions.push('romania');
  if (inTurkey) regions.push('turkey');
  if (inItaly) regions.push('italy');
  if (inCzechia) regions.push('czechia');
  if (inSlovakia) regions.push('slovakia');
  if (inGermany) regions.push('germany');
  if (inFrance) regions.push('france');
  if (inSpain) regions.push('spain');
  if (inPoland) regions.push('poland');

  if (lat > 24 && lat < 46 && lng > 122 && lng < 154) regions.push('japan');
  if (lat > -10 && lat < 60 && lng > 60 && lng < 150) regions.push('asia');
  if (lat > -45 && lat < -10 && lng > 110 && lng < 155) regions.push('asia');

  return regions.length > 0 ? regions : ['uk', 'us-east'];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const region = searchParams.get('region');
    const lat = Number.parseFloat(searchParams.get('lat') || '0');
    const lng = Number.parseFloat(searchParams.get('lng') || '0');

    let regionsToFetch: string[];
    if (region === 'all') {
      regionsToFetch = Object.keys(REGION_FETCHERS);
    } else if (region) {
      regionsToFetch = region.split(',').filter((value) => value in REGION_FETCHERS);
    } else if (lat !== 0 || lng !== 0) {
      regionsToFetch = getRegionsForBounds(lat, lng);
    } else {
      regionsToFetch = Object.keys(REGION_FETCHERS);
    }

    const results = await Promise.allSettled(regionsToFetch.map((key) => REGION_FETCHERS[key]()));
    const allCameras: CameraRecord[] = [];
    const sources: Record<string, number> = {};

    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      for (const cam of result.value) {
        allCameras.push(cam);
        sources[cam.source] = (sources[cam.source] || 0) + 1;
      }
    }

    return NextResponse.json({
      cameras: allCameras,
      total: allCameras.length,
      sources,
      regions: regionsToFetch,
      timestamp: new Date().toISOString(),
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (error) {
    console.error('CCTV fetch error:', error);
    return NextResponse.json({ cameras: [], error: 'Failed' }, { status: 500 });
  }
}
