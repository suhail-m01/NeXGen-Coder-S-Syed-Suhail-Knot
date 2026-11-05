import type { DatePreset } from './HackathonFilters';

export function localDateInputValue(value: string): string {
  if (!value || /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function rangeForDatePreset(preset: DatePreset, now = new Date()): { from: string; to: string } {
  if (preset === 'any' || preset === 'custom') return { from: '', to: '' };
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  if (preset === 'today') {
    end.setHours(23, 59, 59, 999);
  } else if (preset === 'month') {
    end.setMonth(end.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
  } else {
    const day = now.getDay();
    const daysUntilSaturday = day === 0 ? 0 : day === 6 ? 0 : 6 - day;
    start.setDate(start.getDate() + daysUntilSaturday);
    end.setTime(start.getTime());
    end.setDate(start.getDate() + (start.getDay() === 6 ? 1 : 0));
    end.setHours(23, 59, 59, 999);
  }
  return { from: start.toISOString(), to: end.toISOString() };
}
