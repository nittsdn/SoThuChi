import { format, addDays as dateFnsAddDays } from 'date-fns';
import { vi } from 'date-fns/locale';

export const formatDate = (date: Date): string => {
  return format(date, 'dd/MM/yyyy');
};

export const formatDateISO = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

export const getDayOfWeek = (date: Date): string => {
  const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  return days[date.getDay()];
};

export const getDayOfWeekLong = (date: Date): string => {
  return format(date, 'EEEE', { locale: vi });
};

export const addDays = (date: Date, days: number): Date => {
  return dateFnsAddDays(date, days);
};

export const parseDate = (dateStr: string): Date => {
  return new Date(dateStr);
};
