# Cahier des Charges - Frilya

**Nom de la plateforme :** Frilya  
**Slogan :** "Les talents français pour tous vos projets"  
**Référence visuelle/fonctionnelle :** [ComeUP](https://comeup.com/fr/)  
**Principe directeur :** Simplicité maximale d'utilisation. L'interface doit être compréhensible par n'importe quel utilisateur dès la première visite, sans superflu, sans étape inutile, sans jargon technique. Chaque écran doit avoir un objectif unique et clair.  
**Contrainte technique majeure :** L'ensemble du site (front-end et back-office) doit être 100% responsive (mobile, tablette, desktop).

---

## 1. Stack technique proposée

*   **Front-end :** React (Vite) / Tailwind CSS pour un design épuré et cohérent.
*   **Back-end / Base de données :** Supabase (PostgreSQL relationnel, adapté aux transactions et à l'intégrité des données financières) + Edge Functions pour la logique backend.
*   **Authentification :** Supabase Auth (JWT), avec vérification d'email obligatoire.
*   **Stockage fichiers :** Supabase Storage (type S3) pour les images d'annonces, avatars, pièces jointes des messages/litiges.
*   **Paiement :** Intégration Stripe Connect (escrow) entre acheteur et vendeur, avec commission automatique de la plateforme.
*   **Notifications :** Système temps réel (Supabase Realtime) pour messages privés et notifications, complété par des emails transactionnels.
*   **Logs :** Stockage structuré des actions sensibles (connexions, transactions, modifications de compte, actions admin) pour audit.

---

## 2. Identité et design

*   **Palette de couleurs :** Sobre et professionnelle (contraste fort, ex: Noir/Jaune ou identité propre à Frilya).
*   **Typographie :** Lisible, hiérarchie visuelle claire (titres, sous-titres, CTA toujours visibles).
*   **Boutons d'action explicites :** "Publier une annonce", "Devenir vendeur", "Contacter le vendeur", "Rechercher".
*   **Navigation :** Aucune fonctionnalité cachée dans des menus profonds : les actions principales (rechercher, publier, messages, notifications) doivent être accessibles en 1 clic depuis n'importe quelle page.
*   **Design "mobile first" :** La navigation doit se transformer proprement en menu hamburger, les tableaux de bord doivent rester lisibles sur petit écran.

---

## 3. Front-end (côté utilisateur public)

### 3.1 Page d'accueil
*   Barre de recherche principale (services / freelances).
*   Slogan et accroche : "Les talents français pour tous vos projets".
*   Mise en avant des catégories populaires (logo, montage vidéo, SEO, développement web, rédaction, etc.).
*   Mise en avant de vendeurs/annonces recommandés (notes, nombre de ventes).
*   Bloc de réassurance (nombre de freelances, services livrés, partenaires/clients qui font confiance).
*   Footer avec liens légaux (CGU, CGV, politique de confidentialité, contact).

### 3.2 Création de compte
*   Un seul formulaire d'inscription simple (email, mot de passe, nom), avec choix du statut à tout moment :
    *   **Acheteur :** accès immédiat pour commander des services.
    *   **Vendeur :** accès à un espace vendeur après validation du profil (informations professionnelles, moyen de paiement pour être payé).
*   Un compte doit pouvoir cumuler les deux rôles (acheteur ET vendeur) sans devoir créer deux comptes.
*   Vérification d'email obligatoire avant toute transaction.

### 3.3 Annonces (services)
*   **Fiche annonce claire :** titre, description, tarifs (par formule si besoin : Basique / Standard / Premium), délais de livraison, avis clients, portfolio/exemples.
*   **Recherche avec filtres simples :** catégorie, prix, délai, note du vendeur.
*   Fil d'Ariane et retour facile vers les résultats de recherche.

### 3.4 Espace vendeur
*   **Tableau de bord :** vue d'ensemble des commandes en cours, revenus, notifications.
*   **Mes annonces :** création, édition, mise en pause, suppression d'annonces (formulaire simple, étape par étape).
*   **Commandes :** liste des commandes reçues, statut (en attente, en cours, livrée, terminée, litige), actions (livrer, demander un délai, annuler).
*   **Messagerie privée :** conversation liée à chaque commande + messagerie libre avec les acheteurs.
*   **Litiges :** suivi des litiges ouverts sur ses commandes, dépôt de preuves, échange avec le support.
*   **Contact SAV :** formulaire de contact / création de ticket support.
*   **Paramètres du compte :** informations bancaires, facturation, notifications.

### 3.5 Espace acheteur
*   **Tableau de bord :** commandes en cours, historique.
*   **Annonces favorites :** liste des services enregistrés en favoris.
*   **Messagerie privée :** échanges avec les vendeurs.
*   **Notifications :** nouvelles réponses, livraisons, statut des commandes, alertes litiges.
*   **Litiges :** ouverture et suivi d'un litige sur une commande.
*   **Contact SAV :** formulaire de contact / création de ticket support.
*   **Paramètres du compte :** informations personnelles, moyens de paiement, mot de passe.

---

## 4. Back-office / Administration

Interface d'administration séparée (accès restreint par rôle admin), simple et fonctionnelle, avec les modules suivants :

### 4.1 Gestion des comptes
*   Liste et recherche des utilisateurs (acheteurs/vendeurs).
*   Fiche utilisateur détaillée : informations, statut du compte (actif, suspendu, banni), historique des commandes, historique des litiges.
*   Actions : valider un profil vendeur, suspendre/bannir un compte, réinitialiser un mot de passe, modifier un rôle.

### 4.2 Gestion des annonces
*   Modération des annonces publiées (validation, mise en avant, suspension pour non-conformité).
*   Recherche et filtres par catégorie, statut, vendeur.
*   Historique des modifications d'une annonce.

### 4.3 Gestion des transactions
*   Liste de toutes les transactions (montant, commission plateforme, statut : en attente, séquestrée, libérée, remboursée).
*   Détail d'une transaction : lien commande/acheteur/vendeur, actions manuelles en cas de litige (remboursement, déblocage de fonds).
*   Export comptable (CSV/Excel).

### 4.4 Messagerie privée (supervision)
*   Accès en lecture aux conversations en cas de litige ou de signalement, avec traçabilité de la consultation par l'admin (RGPD).

### 4.5 Gestion des litiges
*   File d'attente des litiges ouverts, avec priorité et statut (nouveau, en cours d'analyse, résolu).
*   Vue centralisée : commande concernée, échanges entre les parties, pièces jointes, décision de l'admin, historique des décisions similaires.

### 4.6 Logs
*   Journal des actions sensibles : connexions admin, modifications de compte, actions sur les transactions, modération d'annonces.
*   Filtrage par utilisateur, type d'action, période.

### 4.7 Tickets clients (SAV)
*   File d'attente des tickets reçus depuis l'espace acheteur/vendeur.
*   Statuts (nouveau, en cours, en attente de réponse client, résolu, fermé).
*   Attribution des tickets à un agent, réponse directe depuis l'interface, historique des échanges.

### 4.8 Tableau de bord admin
*   Statistiques clés : nombre d'inscriptions, annonces publiées, chiffre d'affaires, litiges en cours, tickets ouverts.

---

## 5. Sécurité et conformité

*   Chiffrement des mots de passe (bcrypt/argon2), protection contre les attaques par force brute (géré par Supabase Auth).
*   Conformité RGPD (consentement, droit à l'oubli, export des données personnelles).
*   Système de paiement en séquestre (Stripe Connect) pour sécuriser les transactions entre acheteurs et vendeurs.
*   Journalisation systématique des actions administratives sensibles pour audit.

---

## 6. Livrables attendus

*   Architecture technique détaillée (schéma de base de données, découpage des API).
*   Maquettes/wireframes des principales pages (accueil, fiche annonce, espace vendeur, espace acheteur, back-office).
*   Code source du front-end et du back-end, structuré et documenté.
*   Documentation d'installation et de déploiement.
*   Jeu de données de test (utilisateurs, annonces, commandes) pour la démonstration.
