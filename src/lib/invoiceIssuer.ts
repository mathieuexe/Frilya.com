/**
 * Informations légales figurant sur les factures.
 *
 * ⚠️ À COMPLÉTER avant toute facturation réelle : ces mentions sont obligatoires
 * (article L441-9 du code de commerce). Je ne connais pas les données juridiques
 * de la société, les valeurs ci-dessous sont donc des emplacements à remplir.
 */
export const INVOICE_ISSUER = {
  name: 'Frilya',
  legalName: 'Frilya',              // ex. « Frilya SAS »
  address1: 'Adresse à compléter',
  address2: 'Code postal et ville à compléter',
  country: 'France',
  siret: 'SIRET à compléter',
  vatNumber: '',                    // n° de TVA intracommunautaire, si assujetti
  email: 'support@frilya.com',
  website: 'frilya.com',
  /**
   * Mention de TVA. Si la société n'est pas assujettie, la mention
   * « TVA non applicable, art. 293 B du CGI » est obligatoire.
   * Si elle l'est, indiquer le taux et remplir vatNumber.
   */
  vatNote: 'TVA non applicable, art. 293 B du CGI — mention à valider avec votre comptable'
};

/**
 * Numéro de facture dérivé de la commande : stable, unique, lisible.
 *
 * ⚠️ Une numérotation strictement séquentielle et sans trou est exigée en
 * comptabilité. Ce format identifie la commande de façon fiable mais n'est pas
 * séquentiel : prévoir une séquence Postgres (colonne orders.invoice_number)
 * avant d'utiliser ces factures comme pièces comptables officielles.
 */
export const invoiceNumber = (order: any) => {
  const date = new Date(order?.paid_at || order?.created_at || Date.now());
  const yyyymm = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const suffix = String(order?.id || '').replace(/-/g, '').slice(0, 8).toUpperCase();
  return `FRILYA-${yyyymm}-${suffix}`;
};
