import { format } from 'date-fns';

export function formatDateTime(date: Date) {
  return format(date, 'yyyy-MM-dd HH:mm:ss');
}

export function formatDateTimeMs(date: Date) {
  return format(date, 'yyyy-MM-dd HH:mm:ss.SSS');
}
