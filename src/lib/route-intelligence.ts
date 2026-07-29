export interface RouteCandidateScore {
  id: string;
  label: string;
  durationSeconds: number;
  nearbySignals: number;
  criticalCases?: number;
  riskWeight?: number;
}

export interface IntelligentRouteRecommendation {
  routeId: string;
  label: string;
  reason: string;
  nearbySignals: number;
  durationSeconds: number;
  savingsSeconds: number;
  signalReduction: number;
  shouldSwitch: boolean;
  confidence: 'high' | 'medium';
}

export function recommendRoute({
  activeRouteId,
  candidates,
}: {
  activeRouteId: string;
  candidates: RouteCandidateScore[];
}): IntelligentRouteRecommendation | null {
  if (candidates.length === 0) return null;

  const active = candidates.find((candidate) => candidate.id === activeRouteId) ?? candidates[0];
  const fastestDuration = Math.min(...candidates.map((candidate) => candidate.durationSeconds));
  const ranked = [...candidates].sort((a, b) => {
    // Corroborated operational cases carry more weight than isolated signals.
    const scoreA = a.durationSeconds + Math.min(a.riskWeight ?? a.nearbySignals, 12) * 75;
    const scoreB = b.durationSeconds + Math.min(b.riskWeight ?? b.nearbySignals, 12) * 75;
    return scoreA - scoreB;
  });
  const challenger = ranked[0];
  const savingsSeconds = Math.max(0, active.durationSeconds - challenger.durationSeconds);
  const signalReduction = Math.max(0, active.nearbySignals - challenger.nearbySignals);
  const criticalCaseReduction = Math.max(0, (active.criticalCases ?? 0) - (challenger.criticalCases ?? 0));
  const riskWeightReduction = Math.max(0, (active.riskWeight ?? active.nearbySignals) - (challenger.riskWeight ?? challenger.nearbySignals));
  const detourSeconds = Math.max(0, challenger.durationSeconds - active.durationSeconds);
  const meaningfulTimeSaving = savingsSeconds >= 120
    && savingsSeconds / Math.max(1, active.durationSeconds) >= 0.08;
  const meaningfulRiskReduction = (signalReduction >= 3 || riskWeightReduction >= 4 || criticalCaseReduction >= 1)
    && detourSeconds <= 180;
  const shouldSwitch = challenger.id !== active.id && (meaningfulTimeSaving || meaningfulRiskReduction);
  const selected = shouldSwitch ? challenger : active;

  let reason: string;
  if (shouldSwitch && meaningfulTimeSaving) {
    reason = `Ahorra ${Math.max(2, Math.round(savingsSeconds / 60))} min frente a tu ruta`;
  } else if (shouldSwitch && criticalCaseReduction > 0) {
    reason = `Evita ${criticalCaseReduction} ${criticalCaseReduction === 1 ? 'caso crítico' : 'casos críticos'} · desvío +${Math.max(1, Math.round(detourSeconds / 60))} min`;
  } else if (shouldSwitch && meaningfulRiskReduction) {
    reason = `Evita ${signalReduction} alertas próximas · desvío +${Math.max(1, Math.round(detourSeconds / 60))} min`;
  } else if (active.durationSeconds === fastestDuration && active.nearbySignals === 0) {
    reason = 'Mantén esta ruta · rápida y sin alertas próximas';
  } else {
    reason = 'Mantén esta ruta · no hay una mejora suficiente';
  }

  return {
    routeId: selected.id,
    label: selected.label || 'Ruta recomendada',
    reason,
    nearbySignals: selected.nearbySignals,
    durationSeconds: selected.durationSeconds,
    savingsSeconds: shouldSwitch ? savingsSeconds : 0,
    signalReduction: shouldSwitch ? signalReduction : 0,
    shouldSwitch,
    confidence: candidates.length >= 3 ? 'high' : 'medium',
  };
}
