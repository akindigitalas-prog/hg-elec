export const PRODUCT_CATEGORIES = [
  'appareillage',
  'protection_tableau',
  'cables_conducteurs',
  'eclairage',
  'courant_faible',
  'chauffage_ventilation',
  'securite',
  'main_oeuvre',
  'consommables_fixations',
] as const;

export const PRODUCT_CATEGORY_LABELS: Record<(typeof PRODUCT_CATEGORIES)[number], string> = {
  appareillage: 'Appareillage',
  protection_tableau: 'Protection / Tableau',
  cables_conducteurs: 'Cables & Conducteurs',
  eclairage: 'Eclairage',
  courant_faible: 'Courant faible',
  chauffage_ventilation: 'Chauffage / Ventilation',
  securite: 'Securite',
  main_oeuvre: 'Main d oeuvre',
  consommables_fixations: 'Consommables / Fixations',
};

export const PRODUCT_TYPES = ['fourniture', 'main_oeuvre', 'deplacement'] as const;

export const PRODUCT_UNITS = [
  'piece',
  'm',
  'ml',
  'heure',
  'forfait',
  'boite',
  'rouleau',
  'paire',
  'lot',
] as const;

export const VAT_RATES = [0, 5.5, 10, 20] as const;

export const QUOTE_STATUSES = [
  'brouillon',
  'envoye',
  'accepte',
  'refuse',
  'expire',
] as const;

export const INVOICE_STATUSES = [
  'brouillon',
  'emise',
  'partiellement_payee',
  'payee',
  'annulee',
  'en_retard',
] as const;

export const DISPLAY_MODES = ['total_only', 'group_totals'] as const;

export const ROOM_SUGGESTIONS = [
  'Salon/Sejour',
  'Cuisine',
  'Chambre 1',
  'Couloir',
  'Salle de bain',
  'WC',
  'Garage',
  'Exterieur',
  'Local technique',
  'Bureau',
  'Terrasse',
] as const;

export const JOB_TYPES = ['appartement', 'maison', 'commerce', 'entrepot'] as const;
export const JOB_ZONES = ['interieur', 'exterieur', 'communs'] as const;

export const JOB_TYPE_LABELS: Record<(typeof JOB_TYPES)[number], string> = {
  appartement: 'Appartement',
  maison: 'Maison',
  commerce: 'Commerce',
  entrepot: 'Entrepot',
};

export const JOB_ZONE_LABELS: Record<(typeof JOB_ZONES)[number], string> = {
  interieur: 'Interieur',
  exterieur: 'Exterieur',
  communs: 'Communs',
};

export const JOB_ZONE_ORDER = ['interieur', 'exterieur', 'communs'] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
export type ProductType = (typeof PRODUCT_TYPES)[number];
export type ProductUnit = (typeof PRODUCT_UNITS)[number];
export type VatRate = (typeof VAT_RATES)[number];
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
export type DisplayMode = (typeof DISPLAY_MODES)[number];
export type JobType = (typeof JOB_TYPES)[number];
export type JobZone = (typeof JOB_ZONES)[number];

