export type DateGroup<T> = { title: string; data: T[] };

/**
 * Buckets already newest-first-sorted items into "Today" / "Yesterday" /
 * weekday (rest of this week) / month+day (older, current year) / full date
 * (older, past years) groups, consecutive same-label items merged into one
 * section - for SectionList's `sections` prop.
 */
export function groupByDate<T>(items: T[], getDate: (item: T) => string): DateGroup<T>[] {
  const groups: DateGroup<T>[] = [];
  for (const item of items) {
    const label = dateGroupLabel(getDate(item));
    const last = groups[groups.length - 1];
    if (last && last.title === label) {
      last.data.push(item);
    } else {
      groups.push({ title: label, data: [item] });
    }
  }
  return groups;
}

function dateGroupLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) return date.toLocaleDateString(undefined, { weekday: 'long' });
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });
}
