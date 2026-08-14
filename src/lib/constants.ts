// Compte "Support Frilya" utilisé pour les messages privés envoyés par l'assistance.
// Les messages reçus par ce compte alimentent la boîte "Support SAV" de l'administration.
export const SUPPORT_ACCOUNT_ID = 'f7763c3f-28a7-4f0a-bdce-8e43ed9d9beb';

// Statuts d'une demande SAV (conversation privée avec le compte Support Frilya)
export const SUPPORT_STATUSES = ['nouveau', 'en_cours', 'en_attente', 'cloture'] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

export const SUPPORT_STATUS_LABELS: Record<SupportStatus, string> = {
  nouveau: 'Nouveau',
  en_cours: 'En cours',
  en_attente: 'En attente',
  cloture: 'Clôturé'
};
