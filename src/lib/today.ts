/**
 * "Today" for the build, as a UTC midnight date. Override with RECLO_TODAY=YYYY-MM-DD
 * to make builds and tests reproducible.
 */
export function today(): Date {
  const fixed = process.env.RECLO_TODAY;
  const iso = fixed && /^\d{4}-\d{2}-\d{2}$/.test(fixed) ? fixed : new Date().toISOString().slice(0, 10);
  return new Date(`${iso}T00:00:00Z`);
}
