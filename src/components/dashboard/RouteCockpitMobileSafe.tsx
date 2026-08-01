'use client';

import React, { type ComponentProps, type ErrorInfo, type ReactNode } from 'react';
import { TriangleAlert, X } from 'lucide-react';
import { useLiveRouteIncidents } from '@/hooks/useLiveRouteIncidents';
import { buildLiveRouteIncidentCockpitModel } from '@/lib/live-route-incident-cockpit';
import RouteCockpitMobile from './RouteCockpitMobile';

type RouteCockpitMobileProps = ComponentProps<typeof RouteCockpitMobile>;

type BoundaryProps = {
  children: ReactNode;
  onClearNavigationState: () => void;
  resetKey: string;
};

type BoundaryState = {
  hasError: boolean;
};

class NavigationCockpitBoundary extends React.Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[AEGIS] Mobile navigation cockpit isolated failure', {
      name: error.name,
      message: error.message,
      componentStack: errorInfo.componentStack,
    });
  }

  componentDidUpdate(previousProps: BoundaryProps) {
    if (this.state.hasError && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  private retry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <aside
        className="pointer-events-auto fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-3 right-3 z-[380] mx-auto max-w-md rounded-2xl border border-white/12 bg-[rgba(7,15,24,0.96)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.42)] backdrop-blur-xl"
        role="status"
        aria-live="polite"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100">
          Navegación protegida
        </p>
        <p className="mt-1 text-sm leading-snug text-white/78">
          El panel tuvo un problema, pero el mapa y la ruta siguen activos.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={this.retry}
            className="min-h-11 rounded-xl border border-cyan-300/28 bg-cyan-300/10 px-3 text-xs font-semibold text-cyan-50"
          >
            Reintentar panel
          </button>
          <button
            type="button"
            onClick={this.props.onClearNavigationState}
            className="min-h-11 rounded-xl border border-white/12 bg-white/[0.05] px-3 text-xs font-semibold text-white/78"
          >
            Finalizar ruta
          </button>
        </div>
      </aside>
    );
  }
}

function LiveRouteIncidentBanner({
  model,
  onDismiss,
}: {
  model: NonNullable<ReturnType<typeof buildLiveRouteIncidentCockpitModel>>;
  onDismiss: () => void;
}) {
  const critical = model.severity === 'critical';

  return (
    <aside
      className={`pointer-events-auto fixed left-3 right-3 top-[10.75rem] z-[366] mx-auto max-w-md rounded-2xl border px-3 py-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.34)] backdrop-blur-xl ${
        critical
          ? 'border-rose-300/30 bg-[rgba(38,12,18,0.94)]'
          : 'border-amber-200/24 bg-[rgba(29,22,10,0.94)]'
      }`}
      role="status"
      aria-live="polite"
      aria-label={model.title}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            critical ? 'bg-rose-300/12 text-rose-100' : 'bg-amber-200/10 text-amber-100'
          }`}
          aria-hidden="true"
        >
          <TriangleAlert className="h-5 w-5" strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-[9px] font-semibold uppercase tracking-[0.14em] ${critical ? 'text-rose-100/78' : 'text-amber-100/76'}`}>
            {model.eyebrow}
          </p>
          <p className="mt-0.5 text-sm font-semibold leading-tight text-white">
            {model.title}
          </p>
          <p className="mt-1 truncate text-[11px] leading-tight text-white/66">
            {model.detail}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-white/58 transition-colors active:bg-white/10"
          aria-label="Ocultar incidencia de esta ruta"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}

export default function RouteCockpitMobileSafe(props: RouteCockpitMobileProps) {
  const routeSnapshot = props.routeSnapshot;
  const liveRouteIncidents = useLiveRouteIncidents({
    enabled: props.navigationActive && routeSnapshot?.mode === 'driving',
    route: routeSnapshot?.coordinates ?? [],
    currentLocation: props.currentLocation,
    destination: routeSnapshot
      ? { lat: routeSnapshot.destination.lat, lng: routeSnapshot.destination.lng }
      : null,
  });
  const incidentModel = buildLiveRouteIncidentCockpitModel(liveRouteIncidents);
  const resetKey = [
    routeSnapshot?.activeRouteId ?? 'no-route',
    props.navigationActive ? 'active' : 'inactive',
    props.navigationArrived ? 'arrived' : 'en-route',
  ].join(':');

  return (
    <NavigationCockpitBoundary
      onClearNavigationState={props.onClearNavigationState}
      resetKey={resetKey}
    >
      <RouteCockpitMobile {...props} />
      {incidentModel && (
        <LiveRouteIncidentBanner
          model={incidentModel}
          onDismiss={() => liveRouteIncidents.dismissIncident(incidentModel.incidentId)}
        />
      )}
    </NavigationCockpitBoundary>
  );
}
