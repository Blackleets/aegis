export type RouteAlertPreferences = {
  earthquakes: boolean;
  wildfires: boolean;
  volcanoes: boolean;
  severeWeather: boolean;
  trafficCameras: boolean;
  notifications: boolean;
  haptics: boolean;
};

export const DEFAULT_ROUTE_ALERT_PREFERENCES: RouteAlertPreferences = {
  earthquakes: true,
  wildfires: true,
  volcanoes: true,
  severeWeather: true,
  trafficCameras: true,
  notifications: true,
  haptics: true,
};

export function parseRouteAlertPreferences(value: string | null): RouteAlertPreferences {
  if (!value) return DEFAULT_ROUTE_ALERT_PREFERENCES;

  try {
    const parsed = JSON.parse(value) as Partial<Record<keyof RouteAlertPreferences, unknown>>;
    return Object.fromEntries(
      Object.entries(DEFAULT_ROUTE_ALERT_PREFERENCES).map(([key, fallback]) => [
        key,
        typeof parsed[key as keyof RouteAlertPreferences] === 'boolean'
          ? parsed[key as keyof RouteAlertPreferences]
          : fallback,
      ]),
    ) as RouteAlertPreferences;
  } catch {
    return DEFAULT_ROUTE_ALERT_PREFERENCES;
  }
}

export function updateRouteAlertPreference<K extends keyof RouteAlertPreferences>(
  preferences: RouteAlertPreferences,
  key: K,
  value: RouteAlertPreferences[K],
): RouteAlertPreferences {
  return { ...preferences, [key]: value };
}
