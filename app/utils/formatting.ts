export function formatCrypto(amount: number, ticker: string): string {
  const normalized = Math.max(0, amount);
  return `${normalized.toFixed(8)} ${ticker.toUpperCase()}`;
}

export function formatUsd(amount: number): string {
  const normalized = Math.max(0, amount);
  return `$${normalized.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatTime(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (num: number) => String(num).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function formatPercentage(progress: number): string {
  const clamped = Math.min(Math.max(progress, 0), 1);
  return `${Math.floor(clamped * 100)}%`;
}
