/** 45000 -> "₦45,000.00" */
export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** "grace balogun" -> "Grace Balogun" — normalizes free-text name entry for display/storage. */
export function titleCase(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

/** "2h ago", "Just now", "3d ago" — falls back to a short date beyond a week. */
export function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.round(diffMs / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;

  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** "Expires in 2h", "Expires in 3d", or "Expired 2h ago" for a still-pending item. */
export function expiryLabel(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const past = diffMs < 0;
  const diffMin = Math.round(Math.abs(diffMs) / 60000);

  let amount: string;
  if (diffMin < 60) amount = `${diffMin}m`;
  else if (diffMin < 60 * 24) amount = `${Math.round(diffMin / 60)}h`;
  else amount = `${Math.round(diffMin / (60 * 24))}d`;

  return past ? `Expired ${amount} ago` : `Expires in ${amount}`;
}
