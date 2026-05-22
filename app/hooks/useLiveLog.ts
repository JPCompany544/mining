"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  LOG_MAX_ENTRIES,
  LOG_ROTATION_MAX_MS,
  LOG_ROTATION_MIN_MS,
  type LogEntry,
} from "../config/logTemplates";
import {
  buildBootLogs,
  buildLogEntry,
  formatLogTimestamp,
  pickWeightedLogTemplate,
  randomLogIntervalMs,
  severityClass,
} from "../utils/logEngine";
import { loadLogs, saveLogsImmediate, saveLogsThrottled } from "../storage/persistence";

interface UseLiveLogOptions {
  containerRef: React.RefObject<HTMLElement | null>;
  isActive: boolean;
  speedTier: number;
}

function createLogElement(entry: LogEntry, animate: boolean): HTMLDivElement {
  const el = document.createElement("div");
  el.className = `log-entry${animate ? " log-entry-new" : ""}`;
  el.dataset.id = entry.id;

  const ts = document.createElement("span");
  ts.className = "timestamp";
  ts.textContent = `[${entry.timestamp}]`;

  const sev = document.createElement("span");
  sev.className = `log-severity ${severityClass(entry.severity)}`;
  sev.textContent = `[${entry.severity.toUpperCase()}]`;

  const msg = document.createElement("span");
  msg.className = entry.highlight ? "highlight" : "msg";
  msg.textContent = ` ${entry.message}`;

  el.appendChild(ts);
  el.appendChild(document.createTextNode(" "));
  el.appendChild(sev);
  el.appendChild(msg);

  return el;
}

function renderLogFeed(container: HTMLElement, entries: LogEntry[], animateLatest: boolean): void {
  container.innerHTML = "";
  entries.forEach((entry, index) => {
    const isLatest = animateLatest && index === 0;
    container.appendChild(createLogElement(entry, isLatest));
  });
}

/**
 * Visual-only live terminal log engine (Phase 5).
 */
export function useLiveLog({
  containerRef,
  isActive,
  speedTier,
}: UseLiveLogOptions): { appendSystemLog: (message: string, highlight?: boolean) => void } {
  const entriesRef = useRef<LogEntry[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(isActive);
  const tierRef = useRef(speedTier);

  activeRef.current = isActive;
  tierRef.current = speedTier;

  const persist = useCallback((entries: LogEntry[]) => {
    saveLogsThrottled(entries);
  }, []);

  const prependEntry = useCallback(
    (entry: LogEntry) => {
      const next = [entry, ...entriesRef.current].slice(0, LOG_MAX_ENTRIES);
      entriesRef.current = next;
      const container = containerRef.current;
      if (container) {
        const el = createLogElement(entry, true);
        container.insertBefore(el, container.firstChild);
        while (container.childElementCount > LOG_MAX_ENTRIES) {
          container.removeChild(container.lastElementChild!);
        }
        requestAnimationFrame(() => el.classList.remove("log-entry-new"));
      }
      persist(next);
    },
    [containerRef, persist]
  );

  const appendSystemLog = useCallback(
    (message: string, highlight = true) => {
      prependEntry({
        id: `sys-${Date.now()}`,
        timestamp: formatLogTimestamp(),
        severity: "system",
        message,
        highlight,
      });
    },
    [prependEntry]
  );

  const scheduleNext = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!activeRef.current) return;

    timerRef.current = setTimeout(() => {
      if (!activeRef.current) return;
      const template = pickWeightedLogTemplate(tierRef.current);
      prependEntry(buildLogEntry(template, tierRef.current));
      scheduleNext();
    }, randomLogIntervalMs(LOG_ROTATION_MIN_MS, LOG_ROTATION_MAX_MS));
  }, [prependEntry]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let initial = loadLogs();
    if (initial.length === 0) {
      initial = buildBootLogs();
      saveLogsImmediate(initial);
    }
    entriesRef.current = initial;
    renderLogFeed(container, initial, false);
  }, [containerRef]);

  const wasActiveRef = useRef(false);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (isActive && !wasActiveRef.current) {
      prependEntry({
        id: `session-${Date.now()}`,
        timestamp: formatLogTimestamp(),
        severity: "success",
        message: "Mining session deployed — cluster workers online.",
        highlight: true,
      });
      scheduleNext();
    }

    if (!isActive && wasActiveRef.current) {
      prependEntry({
        id: `stop-${Date.now()}`,
        timestamp: formatLogTimestamp(),
        severity: "system",
        message: "Mining session halted — workers released to pool.",
        highlight: false,
      });
    }

    wasActiveRef.current = isActive;

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isActive, scheduleNext, prependEntry]);

  useEffect(() => {
    tierRef.current = speedTier;
  }, [speedTier]);

  return { appendSystemLog };
}
