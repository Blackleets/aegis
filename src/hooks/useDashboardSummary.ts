import { useCallback, useMemo } from 'react';

import type { DashboardData } from '../lib/dashboard-shell';
import type { BackendStatus, FeedFreshnessMap } from './useDashboardData';

interface MarketPosture {
  label: string;
  spotlight: string;
  recommendation: string;
}

interface LiveBriefSummary {
  label: string;
  detail: string;
}

interface CoreSyncCard {
  key: string;
  label: string;
  value: string;
  freshness: string;
  accent: string;
}

interface IncidentFusionCard {
  label: string;
  sourceMix: string;
  hotspot: string;
  topTheme: string;
  criticalCount: number;
  total: number;
  freshness: string;
}

interface DashboardSummaryState {
  activeIntelAlerts: number;
  maritimePressure: number;
  operationalModeLabel: string;
  commandRailFocus: string;
  marketPosture: MarketPosture;
  liveBriefSummary: LiveBriefSummary;
  coreSyncCards: CoreSyncCard[];
  incidentFusionCard: IncidentFusionCard;
}

export function useDashboardSummary(
  data: DashboardData,
  backendStatus: BackendStatus,
  feedFreshness: FeedFreshnessMap
): DashboardSummaryState {
  const activeIntelAlerts = useMemo(() => {
    const highRiskNews = (data.news || []).filter((item) => typeof item.risk_score === 'number' && item.risk_score >= 6).length;
    const significantQuakes = (data.earthquakes || []).filter((item) => typeof item.magnitude === 'number' && item.magnitude >= 4.5).length;
    const severeIncidents = (data.gdelt || []).filter((item) => item.severity === 'critical' || item.severity === 'high').length;
    return highRiskNews + significantQuakes + severeIncidents;
  }, [data.news, data.earthquakes, data.gdelt]);

  const maritimePressure = useMemo(() => {
    const congestedPorts = (data.maritime_ports || []).filter((port) => port.congestion === 'SEVERE' || port.congestion === 'CONGESTED').length;
    const riskyChokepoints = (data.maritime_chokepoints || []).filter((point) => point.risk === 'CRITICAL' || point.risk === 'HIGH').length;
    return congestedPorts + riskyChokepoints;
  }, [data.maritime_ports, data.maritime_chokepoints]);

  const operationalModeLabel = backendStatus === 'connected'
    ? activeIntelAlerts > 0 || maritimePressure > 0
      ? 'HEIGHTENED WATCH'
      : 'STEADY TRACKING'
    : backendStatus === 'error'
      ? 'DEGRADED FEED STATE'
      : 'LINKING DATA MESH';

  const commandRailFocus = backendStatus === 'connected'
    ? activeIntelAlerts > 0
      ? 'PRIORITY SIGNALS'
      : maritimePressure > 0
        ? 'SUPPLY-CHAIN WATCH'
        : 'ROUTINE RECON'
    : backendStatus === 'error'
      ? 'DEGRADED COVERAGE'
      : 'SYNCING SOURCES';

  const marketPosture = useMemo<MarketPosture>(() => {
    const markets = data.markets;
    const sections = [markets?.indices, markets?.stocks, markets?.oil, markets?.commodities, markets?.crypto];
    const quotes = sections.flatMap((section) => Object.entries(section || {}).map(([name, quote]) => ({ name, ...(quote || {}) })));

    if (quotes.length === 0) {
      return {
        label: 'MARKET SYNCING',
        spotlight: 'Awaiting live market telemetry',
        recommendation: 'Hold current recon posture until market feeds stabilize.',
      };
    }

    const positive = quotes.filter((quote) => quote.up === true).length;
    const negative = quotes.filter((quote) => quote.up === false).length;
    const ranked = quotes
      .filter((quote) => typeof quote.change_percent === 'number')
      .sort((a, b) => Math.abs((b.change_percent as number)) - Math.abs((a.change_percent as number)));
    const lead = ranked[0];
    const alertCount = markets?.scm_alerts?.length || 0;

    let label = 'CROSSCURRENTS';
    if (negative >= positive + 2) label = 'RISK-OFF';
    else if (positive >= negative + 2) label = 'RISK-ON';

    const spotlight = lead && typeof lead.change_percent === 'number'
      ? `${lead.name} ${lead.change_percent >= 0 ? 'leading' : 'dragging'} at ${lead.change_percent >= 0 ? '+' : ''}${lead.change_percent.toFixed(2)}%`
      : 'Mixed price action across tracked assets';

    const recommendation = alertCount > 0
      ? 'Cross-check SCM alerts against energy and materials before escalating.'
      : label === 'RISK-OFF'
        ? 'Prioritize defensive market readouts and watch correlated alert clusters.'
        : label === 'RISK-ON'
          ? 'Use the current bid tone to contrast against live geopolitical pressure.'
          : 'Maintain balanced watch across indices, energy, and digital assets.';

    return { label, spotlight, recommendation };
  }, [data.markets]);

  const liveBriefSummary = useMemo<LiveBriefSummary>(() => {
    if (backendStatus === 'error') {
      return {
        label: 'RECOVERY WINDOW',
        detail: 'Core feeds need stabilization before widening the operating picture.',
      };
    }

    if (activeIntelAlerts > 0 && maritimePressure > 0) {
      return {
        label: 'DUAL PRESSURE',
        detail: `${activeIntelAlerts} high-signal alert${activeIntelAlerts > 1 ? 's' : ''} aligned with ${maritimePressure} maritime or chokepoint stress marker${maritimePressure > 1 ? 's' : ''}.`,
      };
    }

    if (activeIntelAlerts > 0) {
      return {
        label: 'SIGNAL SURGE',
        detail: `${activeIntelAlerts} active alert${activeIntelAlerts > 1 ? 's are' : ' is'} driving the current monitoring cadence.`,
      };
    }

    if (maritimePressure > 0) {
      return {
        label: 'SCM WATCH',
        detail: `${maritimePressure} supply-chain risk point${maritimePressure > 1 ? 's are' : ' is'} feeding the command picture.`,
      };
    }

    return {
      label: 'STEADY COVERAGE',
      detail: 'Signals, markets, and operator telemetry remain aligned across the board.',
    };
  }, [activeIntelAlerts, backendStatus, maritimePressure]);

  const formatFreshness = useCallback((feedKey: string) => {
    const timestamp = feedFreshness[feedKey];
    if (!timestamp) return 'awaiting';

    const ageSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (ageSeconds < 10) return 'live now';
    if (ageSeconds < 60) return `${ageSeconds}s ago`;

    const ageMinutes = Math.floor(ageSeconds / 60);
    if (ageMinutes < 60) return `${ageMinutes}m ago`;

    const ageHours = Math.floor(ageMinutes / 60);
    return `${ageHours}h ago`;
  }, [feedFreshness]);

  const coreSyncCards = useMemo<CoreSyncCard[]>(() => ([
    {
      key: 'news',
      label: 'NEWS',
      value: Array.isArray(data.news) ? data.news.length.toLocaleString() : '0',
      freshness: formatFreshness('news'),
      accent: 'var(--cyan-primary)',
    },
    {
      key: 'earthquakes',
      label: 'QUAKES',
      value: Array.isArray(data.earthquakes) ? data.earthquakes.length.toLocaleString() : '0',
      freshness: formatFreshness('earthquakes'),
      accent: '#F59E0B',
    },
    {
      key: 'markets',
      label: 'MKTS',
      value: Object.values(data.markets?.stocks || {}).length.toLocaleString(),
      freshness: formatFreshness('markets'),
      accent: 'var(--gold-primary)',
    },
    {
      key: 'maritime',
      label: 'SEA',
      value: Array.isArray(data.maritime_ships) ? data.maritime_ships.length.toLocaleString() : '0',
      freshness: formatFreshness('maritime'),
      accent: '#34D399',
    },
  ]), [data.earthquakes, data.markets?.stocks, data.maritime_ships, data.news, formatFreshness]);

  const incidentFusionCard = useMemo<IncidentFusionCard>(() => {
    const incidents = Array.isArray(data.gdelt) ? data.gdelt : [];
    const total = incidents.length;
    const criticalCount = incidents.filter((item) => item.severity === 'critical' || item.severity === 'high').length;

    if (total === 0) {
      return {
        label: 'INCIDENT FUSION STANDBY',
        sourceMix: 'Awaiting upstream conflict telemetry',
        hotspot: 'No hotspot locked yet',
        topTheme: 'Theme clustering pending',
        criticalCount: 0,
        total: 0,
        freshness: formatFreshness('gdelt'),
      };
    }

    const sourceCounts = new Map<string, number>();
    const themeCounts = new Map<string, number>();
    const hotspotCounts = new Map<string, number>();

    for (const incident of incidents) {
      const source = typeof incident.source === 'string' && incident.source ? incident.source : 'Unknown Source';
      sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);

      const theme = typeof incident.theme === 'string' && incident.theme ? incident.theme : 'Geopolitical Incident';
      themeCounts.set(theme, (themeCounts.get(theme) || 0) + 1);

      const hotspot = typeof incident.name === 'string' && incident.name
        ? incident.name.split(' ').slice(0, 4).join(' ')
        : typeof incident.title === 'string' && incident.title
          ? incident.title.split(' ').slice(0, 4).join(' ')
          : 'Unclassified cluster';
      hotspotCounts.set(hotspot, (hotspotCounts.get(hotspot) || 0) + 1);
    }

    const topSource = Array.from(sourceCounts.entries()).sort((a, b) => b[1] - a[1])[0];
    const topTheme = Array.from(themeCounts.entries()).sort((a, b) => b[1] - a[1])[0];
    const topHotspot = Array.from(hotspotCounts.entries()).sort((a, b) => b[1] - a[1])[0];

    return {
      label: criticalCount > 0 ? 'INCIDENT FUSION HOT' : 'INCIDENT FUSION LIVE',
      sourceMix: `${sourceCounts.size} source${sourceCounts.size > 1 ? 's' : ''} • lead ${topSource ? topSource[0] : 'Unknown'}`,
      hotspot: topHotspot ? `${topHotspot[0]}${topHotspot[1] > 1 ? ` ×${topHotspot[1]}` : ''}` : 'No hotspot locked yet',
      topTheme: topTheme ? `${topTheme[0]}${topTheme[1] > 1 ? ` • ${topTheme[1]} hits` : ''}` : 'Theme clustering pending',
      criticalCount,
      total,
      freshness: formatFreshness('gdelt'),
    };
  }, [data.gdelt, formatFreshness]);

  return {
    activeIntelAlerts,
    maritimePressure,
    operationalModeLabel,
    commandRailFocus,
    marketPosture,
    liveBriefSummary,
    coreSyncCards,
    incidentFusionCard,
  };
}
