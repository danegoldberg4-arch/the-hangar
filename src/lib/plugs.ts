// These helpers only parse legacy stored configuration. No runtime caller may
// execute a control decision until an authenticated edge agent is available.
export interface PlugAutomation {
  enabled: boolean;
  solarThresholdW: number;
  batteryThresholdPct: number;
  turnOffWhenBatteryBelow: number;
}

export const defaultAutomation: PlugAutomation = {
  enabled: false,
  solarThresholdW: 2000,
  batteryThresholdPct: 80,
  turnOffWhenBatteryBelow: 50,
};

export function parseAutomation(data: string): PlugAutomation {
  try {
    const parsed = JSON.parse(data);
    return { ...defaultAutomation, ...parsed };
  } catch {
    return defaultAutomation;
  }
}

export function serializeAutomation(automation: PlugAutomation): string {
  return JSON.stringify(automation);
}

export function shouldPlugTurnOn(
  automation: PlugAutomation,
  solarW: number,
  batterySoc: number
): boolean {
  return (
    automation.enabled &&
    solarW >= automation.solarThresholdW &&
    batterySoc >= automation.batteryThresholdPct
  );
}

export function shouldPlugTurnOff(
  automation: PlugAutomation,
  batterySoc: number
): boolean {
  return automation.enabled && batterySoc < automation.turnOffWhenBatteryBelow;
}
