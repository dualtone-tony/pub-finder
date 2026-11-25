export const colors = {
  bg: '#F6F3EE',
  card: '#FFFFFF',
  text: '#1F1A14',
  muted: '#6E655A',
  border: '#E4DDD2',
  accent: '#B45309',
  accentSoft: '#FDF0E1',
  good: '#15803D',
  bad: '#B91C1C',
};

/** Distinct colours for location badges A, B, C... */
export const originColors = ['#2563EB', '#DB2777', '#059669', '#7C3AED', '#EA580C', '#0891B2', '#65A30D', '#9F1239'];

export const originLetter = (i: number) => String.fromCharCode(65 + (i % 26));
