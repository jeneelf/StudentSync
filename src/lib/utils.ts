export type ClassValue = string | number | boolean | undefined | null | { [key: string]: boolean | undefined | null } | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];

  for (const input of inputs) {
    if (!input) continue;

    if (typeof input === 'string' || typeof input === 'number') {
      classes.push(String(input));
    } else if (Array.isArray(input)) {
      const inner = cn(...input);
      if (inner) classes.push(inner);
    } else if (typeof input === 'object') {
      for (const [key, value] of Object.entries(input)) {
        if (value) classes.push(key);
      }
    }
  }

  return classes.join(' ');
}

export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateString;
  }
}

export function getDaysUntil(dateString: string): { days: number; text: string; isPast: boolean } {
  const target = new Date(dateString).getTime();
  const now = new Date().setHours(0, 0, 0, 0);
  const diff = target - now;
  const days = Math.round(diff / (1000 * 60 * 60 * 24));
  
  if (days < 0) return { days, text: `${Math.abs(days)}d ago`, isPast: true };
  if (days === 0) return { days, text: 'Due Today', isPast: false };
  if (days === 1) return { days, text: 'Due Tomorrow', isPast: false };
  return { days, text: `${days} days left`, isPast: false };
}
