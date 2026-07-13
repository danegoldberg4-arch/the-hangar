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

export function serializeAutomation(a: PlugAutomation): string {
  return JSON.stringify(a);
}

export function shouldPlugTurnOn(
  automation: PlugAutomation,
  solarW: number,
  batterySoc: number
): boolean {
  if (!automation.enabled) return false;
  return solarW >= automation.solarThresholdW && batterySoc >= automation.batteryThresholdPct;
}

export function shouldPlugTurnOff(
  automation: PlugAutomation,
  batterySoc: number
): boolean {
  if (!automation.enabled) return false;
  return batterySoc < automation.turnOffWhenBatteryBelow;
}
