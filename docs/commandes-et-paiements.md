# Tunnel de vente, commandes et paiements

## Parcours

```
Fiche service  →  /paiement/:id  →  Stripe (si carte)  →  /commande/confirmation  →  Mes commandes
                  1. Récapitulatif
                  2. Informations demandées (si le service en a)
                  3. Paiement (solde ou carte)
```

## Cycle de vie d'une commande

| Statut | Signification | Qui fait avancer |
|---|---|---|
| `pending` | commande créée, paiement non confirmé | — |
| `in_progress` | payée, fonds séquestrés, le vendeur doit livrer | `api/verify-payment` (carte) ou RPC `pay_order_with_balance` (solde) |
| `delivered` | livrée, en attente de validation | le vendeur, depuis Mes commandes |
| `completed` | validée : le vendeur est crédité de (montant − commission) | l'acheteur, via RPC `complete_order` |
| `cancelled` / `disputed` | annulée / litige | administration |

## Règles de sécurité appliquées

1. **Les montants ne viennent jamais du navigateur.** `api/create-order.ts` relit le
   service, le forfait et le pourcentage de commission en base, puis recalcule
   prix, frais et total. Avant, le client envoyait `amount` : n'importe qui pouvait
   commander à 1 €.
2. **Un paiement carte n'est validé que par le serveur.** `api/verify-payment.ts`
   relit la session chez Stripe (`payment_status === 'paid'`), vérifie que la
   session correspond bien à la commande, puis passe la commande en `in_progress`.
   L'appel est idempotent.
3. **Le paiement par solde est atomique.** La fonction Postgres
   `pay_order_with_balance` (SECURITY DEFINER) verrouille la commande et le profil
   (`FOR UPDATE`), vérifie le propriétaire et le solde, débite, écrit au grand livre
   et marque la commande payée — en une transaction. Pas de double débit possible.
4. **Contrôles métier serveur** : commande impossible sur sa propre annonce, sur une
   annonce non active, ou pendant la bêta.

## Porte-monnaie

- `profiles.balance` : solde disponible (le tableau de bord vendeur s'y référait
  déjà alors que la colonne n'existait pas).
- `wallet_transactions` : grand livre (sens, montant, solde après, motif, commande).
  Lecture de son propre historique ; écriture réservée aux fonctions SECURITY DEFINER.
- Crédit du vendeur : à la validation de la livraison par l'acheteur (`complete_order`).
- Ajustement manuel : `admin_adjust_wallet(user_id, montant, motif)`, réservé aux
  administrateurs — utile pour un remboursement, un geste commercial, ou pour
  créditer un compte de test afin d'essayer le paiement par solde :

```sql
select admin_adjust_wallet('<uuid utilisateur>', 100, 'Crédit de test');
```

## Moyens de paiement Stripe

`api/create-order.ts` ne restreint pas `payment_method_types` : la page Stripe
Checkout propose donc **tous les moyens activés dans le tableau de bord Stripe**
(carte Visa / Mastercard / Amex, Apple Pay, Google Pay, Link, et les moyens locaux
que tu actives). Pour en ajouter : Stripe → Settings → Payment methods, aucun
changement de code nécessaire.

## Variables d'environnement

| Variable | Usage |
|---|---|
| `STRIPE_SECRET_KEY` | création et vérification des sessions Checkout |
| `SUPABASE_SERVICE_ROLE_KEY` | création de commande et confirmation côté serveur |
| `VITE_SUPABASE_URL` | client Supabase serveur |

## Migration à exécuter

`checkout_and_wallet.sql` dans l'éditeur SQL Supabase. Elle crée le solde, le grand
livre, les colonnes de commande, les policies manquantes (**`orders` n'avait aucune
policy INSERT : aucune commande ne pouvait être créée**) et les trois fonctions.

## Reste à faire (hors périmètre actuel)

- **Webhook Stripe** (`checkout.session.completed`) : aujourd'hui la confirmation a
  lieu au retour de l'acheteur sur `/commande/confirmation`. Si l'acheteur ferme
  l'onglet juste après avoir payé, la commande reste `pending` jusqu'à sa prochaine
  visite sur ce lien. Un webhook rendrait la confirmation indépendante du navigateur.
- **Remboursement** depuis l'administration (API Stripe Refund + crédit du solde).
- **Virement du solde vers le compte bancaire** du vendeur (table `withdrawals`
  existante, à brancher sur Stripe Connect ou un traitement manuel).
