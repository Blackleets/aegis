export const LOCAL_RISK_MAX_ACCURACY_METERS = 250;

export function shouldMonitorLocalRisks(
  navigationActive: boolean,
  localMonitoringEnabled: boolean,
) {
  return navigationActive || localMonitoringEnabled;
}

export function isAcceptableLocalRiskFix(accuracyMeters: number | null) {
  return accuracyMeters === null || accuracyMeters <= LOCAL_RISK_MAX_ACCURACY_METERS;
}
