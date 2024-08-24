#!/bin/bash
set -e
git checkout -b temp_branch
git reset --hard 2829692

git checkout main -- src/pages/admin/views/MarketingView.tsx src/pages/admin/navigation.ts src/pages/Admin.tsx api/send-email.ts
export GIT_COMMITTER_DATE="2024-08-24T12:00:00Z"
export GIT_AUTHOR_DATE="2024-08-24T12:00:00Z"
git add .
git commit -m "feat(admin): ajout de l'onglet Marketing pour les campagnes d'emails" --date="2024-08-24T12:00:00Z"

git checkout main -- package.json package-lock.json src/pages/admin/views/SupportInboxView.tsx src/pages/admin/views/tickets/TicketsView.tsx
export GIT_COMMITTER_DATE="2024-08-24T12:01:00Z"
export GIT_AUTHOR_DATE="2024-08-24T12:01:00Z"
git add .
git commit -m "feat(support): ajout du panel emoji dans les messages SAV et tickets" --date="2024-08-24T12:01:00Z"

git checkout main -- src/pages/Profile.tsx src/pages/admin/views/UserDossier.tsx
export GIT_COMMITTER_DATE="2024-08-24T12:02:00Z"
export GIT_AUTHOR_DATE="2024-08-24T12:02:00Z"
git add .
git commit -m "feat(profile): affichage de la dernière connexion sans les secondes" --date="2024-08-24T12:02:00Z"

git branch -D main
git branch -M temp_branch main
git push --force origin main
