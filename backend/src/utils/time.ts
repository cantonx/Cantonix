/**
 * time.ts
 * Human-readable relative time helpers.
 */

export function formatLastChecked(checkedAt: Date): string {
  const diffMs  = Date.now() - checkedAt.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 5)  return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  return `${Math.floor(diffMin / 60)}h ago`;
}
