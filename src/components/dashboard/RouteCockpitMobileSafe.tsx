'use client';

import React, { type ComponentProps, type ErrorInfo, type ReactNode } from 'react';
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

export default function RouteCockpitMobileSafe(props: RouteCockpitMobileProps) {
  const resetKey = [
    props.routeSnapshot?.activeRouteId ?? 'no-route',
    props.navigationActive ? 'active' : 'inactive',
    props.navigationArrived ? 'arrived' : 'en-route',
  ].join(':');

  return (
    <NavigationCockpitBoundary
      onClearNavigationState={props.onClearNavigationState}
      resetKey={resetKey}
    >
      <RouteCockpitMobile {...props} />
    </NavigationCockpitBoundary>
  );
}
