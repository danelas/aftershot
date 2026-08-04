// Caption for a before/after reel. Mirrors worker/poster.mjs's buildCaption so
// a reel shared by hand from /account reads exactly like an auto-posted one.
const SERVICE: Record<string, string> = {
  pressure_washing: 'Pressure washing',
  detailing: 'Auto detailing',
  landscaping: 'Landscaping',
  painting: 'Painting',
  roof_cleaning: 'Roof cleaning',
  epoxy_floors: 'Epoxy floors',
  remodeling: 'Remodeling',
  junk_removal: 'Junk removal',
  cleaning: 'Cleaning',
  pool_care: 'Pool care',
  carpet_tile: 'Carpet & tile cleaning',
  window_cleaning: 'Window cleaning',
};

const TAGS: Record<string, string> = {
  pressure_washing: '#pressurewashing #satisfying #beforeandafter #cleaning #powerwashing',
  detailing: '#autodetailing #cardetailing #satisfying #beforeandafter',
  landscaping: '#landscaping #lawncare #transformation #beforeandafter',
};

export function buildCaption(opts: {
  businessName: string;
  city?: string | null;
  trade?: string | null;
  hook?: string | null;
}): string {
  const svc = (opts.trade && SERVICE[opts.trade]) || 'Transformation';
  const loc = opts.city ? ` in ${opts.city}` : '';
  const tags = (opts.trade && TAGS[opts.trade]) || '#beforeandafter #satisfying';
  return `${opts.hook || 'Look at this transformation'} 😳\n\n${svc}${loc} by ${opts.businessName}. Book yours today!\n\n${tags}`;
}
