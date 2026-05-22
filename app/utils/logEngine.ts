import {
  BOOT_LOG_MESSAGES,
  LOG_TEMPLATES,
  type LogEntry,
  type LogSeverity,
  type LogTemplate,
} from "../config/logTemplates";

export function formatLogTimestamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function createLogId(): string {
  return `log-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function resolveMessage(template: LogTemplate, tier: number): string {
  return typeof template.message === "function"
    ? template.message(tier)
    : template.message;
}

export function pickWeightedLogTemplate(speedTier: number): LogTemplate {
  const eligible = LOG_TEMPLATES.filter(
    (t) => t.minTier === undefined || speedTier >= t.minTier
  );
  const totalWeight = eligible.reduce((sum, t) => sum + t.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const template of eligible) {
    roll -= template.weight;
    if (roll <= 0) return template;
  }
  return eligible[eligible.length - 1];
}

export function buildLogEntry(
  template: LogTemplate,
  speedTier: number,
  timestamp = formatLogTimestamp()
): LogEntry {
  return {
    id: createLogId(),
    timestamp,
    severity: template.severity,
    message: resolveMessage(template, speedTier),
    highlight: template.highlight ?? template.severity === "success",
  };
}

export function buildBootLogs(): LogEntry[] {
  const ts = formatLogTimestamp();
  return BOOT_LOG_MESSAGES.map((boot, i) => ({
    id: createLogId(),
    timestamp: ts,
    severity: boot.severity,
    message: boot.message,
    highlight: boot.highlight,
  })).map((entry, i) => ({
    ...entry,
    timestamp: formatLogTimestamp(new Date(Date.now() - (BOOT_LOG_MESSAGES.length - i) * 1000)),
  }));
}

export function severityClass(severity: LogSeverity): string {
  switch (severity) {
    case "success":
      return "log-severity-success";
    case "warn":
      return "log-severity-warn";
    case "system":
      return "log-severity-system";
    default:
      return "log-severity-info";
  }
}

export function randomLogIntervalMs(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
