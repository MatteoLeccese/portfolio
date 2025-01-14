const MONTHS: string[] = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

export const getMonthAndYear = (date?: string | null): string => {
  if (!date) return 'Present';

  const parsedDate = new Date(date);
  const month: number | null = parsedDate.getMonth() ?? null;
  const year: number | null = parsedDate.getFullYear() ?? null;

  return month == null || year == null ? '' : `${MONTHS[month].slice(0, 3)} ${year}`;
};
