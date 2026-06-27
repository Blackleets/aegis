'use client';

import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plane,
  Satellite,
  Activity,
  Radio,
  Eye,
  Shield,
  Sun,
  AlertTriangle,
  Camera,
  Flame,
  CloudLightning,
  Radiation,
  Tv,
  Ship,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight,
  Network,
} from 'lucide-react';

type LayerDataMap = Record<string, unknown>;
type ActiveLayers = Record<string, boolean>;

interface LayerConfig {
  key: string;
  label: string;
  icon: typeof Network;
  color: string;
  dataKey: string;
}

interface LayerGroup {
  label: string;
  icon: typeof Network;
  color: string;
  layers: LayerConfig[];
}

interface LayerPanelProps {
  data: LayerDataMap;
  activeLayers: ActiveLayers;
  setActiveLayers: React.Dispatch<React.SetStateAction<ActiveLayers>>;
}

const LAYER_GROUPS: LayerGroup[] = [
  {
    label: 'AEGIS SDK',
    icon: Network,
    color: '#1565C0',
    layers: [
      { key: 'sdk_stream', label: 'Intelligence Stream', icon: Network, color: '#1565C0', dataKey: 'sdk_entities' },
    ],
  },
  {
    label: 'AVIATION',
    icon: Plane,
    color: '#00E5FF',
    layers: [
      { key: 'flights', label: 'Commercial', icon: Plane, color: '#00E5FF', dataKey: 'commercial_flights' },
      { key: 'private', label: 'Private', icon: Plane, color: '#00E676', dataKey: 'private_flights' },
      { key: 'jets', label: 'Private Jets', icon: Plane, color: '#FF69B4', dataKey: 'private_jets' },
      { key: 'military', label: 'Military', icon: Shield, color: '#FF3D3D', dataKey: 'military_flights' },
    ],
  },
  {
    label: 'MARITIME & SPACE',
    icon: Ship,
    color: '#00BCD4',
    layers: [
      { key: 'maritime', label: 'Maritime / Naval', icon: Ship, color: '#00BCD4', dataKey: 'maritime_ships,maritime_ports,maritime_chokepoints' },
      { key: 'satellites', label: 'Satellites', icon: Satellite, color: '#D4AF37', dataKey: 'satellites' },
    ],
  },
  {
    label: 'SURVEILLANCE',
    icon: Camera,
    color: '#39FF14',
    layers: [
      { key: 'cctv', label: 'CCTV Cameras', icon: Camera, color: '#39FF14', dataKey: 'cameras' },
      { key: 'live_news', label: 'Live News Feeds', icon: Tv, color: '#FF4081', dataKey: 'live_feeds' },
    ],
  },
  {
    label: 'NATURAL HAZARDS',
    icon: Activity,
    color: '#FF9500',
    layers: [
      { key: 'earthquakes', label: 'Earthquakes (24h)', icon: Activity, color: '#FF9500', dataKey: 'earthquakes' },
      { key: 'fires', label: 'Active Fires', icon: Flame, color: '#FF6B00', dataKey: 'fires' },
      { key: 'weather', label: 'Severe Weather', icon: CloudLightning, color: '#E040FB', dataKey: 'weather_events' },
    ],
  },
  {
    label: 'THREATS & INFRA',
    icon: AlertTriangle,
    color: '#FF3D3D',
    layers: [
      { key: 'infrastructure', label: 'Nuclear Facilities', icon: Radiation, color: '#76FF03', dataKey: 'infrastructure' },
      { key: 'global_incidents', label: 'Global Incidents', icon: AlertTriangle, color: '#FF3D3D', dataKey: 'gdelt' },
      { key: 'gps_jamming', label: 'GPS Jamming', icon: Radio, color: '#FF4444', dataKey: 'gps_jamming' },
    ],
  },
  {
    label: 'DISPLAY',
    icon: Sun,
    color: '#448AFF',
    layers: [
      { key: 'day_night', label: 'Day / Night Cycle', icon: Sun, color: '#448AFF', dataKey: '' },
    ],
  },
];

const ALL_LAYERS = LAYER_GROUPS.flatMap((g) => g.layers);
const DEFAULT_EXPANDED = new Set(['AEGIS SDK', 'SURVEILLANCE']);

function LayerPanel({ data, activeLayers, setActiveLayers }: LayerPanelProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    LAYER_GROUPS.forEach((group) => {
      initial[group.label] = DEFAULT_EXPANDED.has(group.label);
    });
    return initial;
  });

  const toggle = (key: string) => setActiveLayers((prev) => ({ ...prev, [key]: !prev[key] }));

  const getCount = (dk: string): number | null => {
    if (!dk) return null;
    let total = 0;
    let found = false;

    for (const k of dk.split(',')) {
      const value = data[k];
      if (Array.isArray(value)) {
        total += value.length;
        found = true;
      }
    }

    return found ? total : null;
  };

  const totalEntities = ALL_LAYERS.reduce((sum, layer) => sum + (getCount(layer.dataKey) || 0), 0);
  const activeCount = Object.values(activeLayers).filter(Boolean).length;

  const toggleGroup = (groupLabel: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupLabel]: !prev[groupLabel] }));
  };

  const toggleAllInGroup = (group: LayerGroup) => {
    const allActive = group.layers.every((layer) => activeLayers[layer.key]);
    setActiveLayers((prev) => {
      const next = { ...prev };
      group.layers.forEach((layer) => {
        next[layer.key] = !allActive;
      });
      return next;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3, duration: 0.6 }}
      className="glass-panel p-3 pointer-events-auto"
    >
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Eye className="h-3.5 w-3.5 stroke-[1.5] text-[var(--gold-primary)]" />
            <div className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--alert-green)] animate-aegis-pulse" />
          </div>
          <span className="hud-text text-[12px] tracking-widest text-[var(--text-primary)]">DATA LAYERS</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`gotham-tag ${activeCount > 10 ? 'gotham-tag--critical' : activeCount > 5 ? 'gotham-tag--high' : 'gotham-tag--low'}`}
            style={{ fontSize: '8px', padding: '1px 6px' }}
          >
            {activeCount}/{ALL_LAYERS.length}
          </span>
          <span className="gotham-tag gotham-tag--info" style={{ fontSize: '7px', padding: '1px 5px' }}>
            {totalEntities.toLocaleString()} ENT
          </span>
        </div>
      </div>

      <div className="space-y-1 max-h-[16rem] overflow-y-auto pr-1 styled-scrollbar">
        {LAYER_GROUPS.map((group) => {
          const isExpanded = expandedGroups[group.label];
          const groupActiveCount = group.layers.filter((layer) => activeLayers[layer.key]).length;
          const allActive = groupActiveCount === group.layers.length;
          const GroupIcon = group.icon;

          return (
            <div key={group.label}>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="flex flex-1 items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-white/[0.03]"
                >
                  <GroupIcon className="h-3 w-3 flex-shrink-0 stroke-[1.5]" style={{ color: group.color }} />
                  <span className="flex-1 text-left text-[9px] font-bold font-mono tracking-[0.15em] text-[var(--text-secondary)]">
                    {group.label}
                  </span>
                  <span className="text-[8px] font-mono tabular-nums" style={{ color: groupActiveCount > 0 ? group.color : 'var(--text-muted)' }}>
                    {groupActiveCount}/{group.layers.length}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="h-3 w-3 stroke-[1.5] text-[var(--text-muted)]" />
                  ) : (
                    <ChevronDown className="h-3 w-3 stroke-[1.5] text-[var(--text-muted)]" />
                  )}
                </button>
                <button
                  onClick={() => toggleAllInGroup(group)}
                  className="rounded p-1 transition-colors hover:bg-white/[0.05]"
                  title={allActive ? 'Disable all' : 'Enable all'}
                >
                  {allActive ? (
                    <ToggleRight className="h-3.5 w-3.5 stroke-[1.5]" style={{ color: group.color }} />
                  ) : (
                    <ToggleLeft className="h-3.5 w-3.5 stroke-[1.5] text-[var(--text-muted)]" />
                  )}
                </button>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="ml-2 space-y-px border-l border-[var(--border-secondary)]/35 pl-2">
                      {group.layers.map((layer) => {
                        const Icon = layer.icon;
                        const isActive = activeLayers[layer.key];
                        const count = getCount(layer.dataKey);

                        return (
                          <button
                            key={layer.key}
                            onClick={() => toggle(layer.key)}
                            className={`group flex w-full items-center gap-2 rounded-md border px-2 py-1 transition-all duration-200 ${
                              isActive
                                ? 'border-white/[0.06] bg-white/[0.04]'
                                : 'border-transparent hover:bg-white/[0.02]'
                            }`}
                          >
                            <div
                              className={`h-1.5 w-1.5 flex-shrink-0 rounded-full transition-all duration-300 ${isActive ? 'scale-100' : 'scale-50 opacity-30'}`}
                              style={{
                                backgroundColor: layer.color,
                                boxShadow: isActive ? `0 0 6px ${layer.color}60` : 'none',
                              }}
                            />
                            <Icon
                              className="h-3.5 w-3.5 flex-shrink-0 stroke-[1.5] transition-colors duration-200"
                              style={{ color: isActive ? layer.color : 'var(--text-muted)' }}
                            />
                            <span
                              className={`flex-1 text-left text-[10px] font-mono tracking-[0.02em] transition-colors duration-200 ${
                                isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'
                              }`}
                            >
                              {layer.label}
                            </span>
                            {count !== null && (
                              <span
                                className="text-[9px] font-bold font-mono tabular-nums transition-colors duration-200"
                                style={{ color: isActive ? layer.color : 'var(--text-muted)' }}
                              >
                                {count.toLocaleString()}
                              </span>
                            )}
                            <div className={`layer-toggle ${isActive ? 'active' : ''}`} />
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

export default memo(LayerPanel);
