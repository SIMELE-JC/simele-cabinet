# Cabinet SIMELE — TODO

## Base de données & Backend
- [x] Schéma DB : tables clients, dossiers, fiches, scores, messages chat
- [x] Migration SQL appliquée
- [x] Helpers DB (db.ts)
- [x] Procédure tRPC : gestion clients (CRUD)
- [x] Procédure tRPC : chat IA conversationnel (LLM)
- [x] Procédure tRPC : génération fiche entretien initial (LLM + JSON structuré)
- [x] Procédure tRPC : génération fiche diagnostic (LLM + JSON structuré)
- [x] Procédure tRPC : scoring automatique /60
- [x] Procédure tRPC : transcription audio (Whisper)
- [x] Procédure tRPC : export PDF (génération côté serveur)
- [x] Notification propriétaire (nouveau dossier / score critique)

## Frontend
- [x] Design system : palette bleu marine, typographie Inter, tokens CSS
- [x] DashboardLayout avec sidebar navigation
- [x] Page : Tableau de bord (liste clients, filtres score/date/statut)
- [x] Page : Nouveau client / Entretien (chat IA + saisie notes)
- [x] Page : Fiche client (détail dossier, score, fiches générées)
- [x] Page : Diagnostic projet (fiche diagnostic structurée)
- [x] Composant : Enregistrement audio + transcription
- [x] Composant : Visualisation score /60 (jauge / radar)
- [x] Composant : Export PDF (bouton téléchargement)
- [x] Authentification (login / protection routes)

## Tests & Livraison
- [x] Tests vitest backend (8 tests passés)
- [x] Checkpoint final
- [ ] Livraison utilisateur
