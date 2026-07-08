# Auto-hébergement : Exécutable autonome `.exe` (Windows)

Pour les utilisateurs Windows qui ne veulent pas installer Docker, Python ni Node, Walker est aussi
publié sous forme d'un unique exécutable autonome.

!!! note
    La version exécutable autonome `.exe` est produite par son propre pipeline de release. Si vous
    n'en voyez pas encore sur la page Releases, utilisez l'[option Docker](docker.md) en attendant.

## Télécharger et exécuter

1. Allez sur la [page des releases](https://github.com/davidp57/Walker/releases) du projet sur GitHub.
2. Téléchargez le `.exe` attaché à la dernière release.
3. Double-cliquez dessus.

C'est tout — pas d'installateur, pas de droits administrateur, pas de configuration de base de données
séparée. Au premier lancement, Walker démarre son propre serveur web local et ouvre automatiquement
votre navigateur par défaut pointé sur l'application en marche (`http://localhost:8000`). Une fenêtre
de console reste ouverte en arrière-plan pendant que Walker tourne ; la fermer arrête l'application.

## Où vivent vos données

La version autonome conserve sa base de données SQLite dans votre profil utilisateur Windows
(`%APPDATA%\Walker\walker.db`), pas à côté de l'exécutable lui-même. Cela signifie que :

- Vous pouvez déplacer, renommer ou supprimer le fichier `.exe` sans perdre vos données.
- Télécharger un `.exe` plus récent et l'exécuter reprend automatiquement vos données existantes —
  tout changement de schéma est appliqué en arrière-plan au démarrage, si bien que mettre à jour ne
  signifie jamais repartir de zéro.

## Quand préférer ceci à Docker

L'exécutable autonome `.exe` est le moyen le plus rapide d'essayer Walker ou de l'exécuter de façon
permanente sur une machine Windows personnelle sans rien d'autre d'installé. Si vous voulez exécuter
Walker sur un serveur, le partager avec d'autres, ou si vous n'êtes pas sous Windows, utilisez plutôt
l'[option Docker](docker.md).
