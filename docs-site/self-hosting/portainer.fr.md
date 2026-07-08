# Auto-hébergement : Portainer

L'image Docker publiée de Walker (`ghcr.io/davidp57/walker`) peut être déployée en stack
[Portainer](https://www.portainer.io/) sans clone du dépôt ni étape de compilation — Portainer se
contente de récupérer l'image pré-compilée.

## Prérequis : visibilité de l'image

Les paquets de GitHub Container Registry sont **privés par défaut**, même quand le dépôt source est
public. Avant de déployer, assurez-vous que `ghcr.io/davidp57/walker` est accessible depuis votre hôte
Portainer :

- **Image publique (le plus simple)** : sur GitHub, allez sur la page du paquet
  (`https://github.com/davidp57?tab=packages`, paquet `walker`) → **Package settings** →
  **Danger Zone** → **Change visibility** → **Public**.
- **Image privée** : ajoutez plutôt un registre dans Portainer (**Registries** → **Add registry** →
  **Custom registry**, URL `ghcr.io`, en vous authentifiant avec un nom d'utilisateur GitHub et un
  [jeton d'accès personnel](https://github.com/settings/tokens) ayant la portée `read:packages`).

## Déployer en stack

Dans Portainer : **Stacks** → **Add stack** → donnez-lui un nom (par ex. `walker`) → **Web editor**,
et collez :

```yaml
services:
  walker:
    image: ghcr.io/davidp57/walker:latest
    ports:
      - "8000:8000"
    volumes:
      - walker-data:/data
    environment:
      WALKER_DATABASE_URL: sqlite:////data/walker.db
    restart: unless-stopped

volumes:
  walker-data:
```

Cliquez sur **Deploy the stack**. Portainer récupère l'image, démarre le conteneur, et Walker est
accessible sur `http://<hôte>:8000`. Le volume `walker-data` conserve la base de données SQLite à
travers les recréations de conteneur et les mises à jour d'image.

Épinglez une version précise plutôt que de toujours suivre `latest` en utilisant un tag de release,
par ex. `ghcr.io/davidp57/walker:1.0.0` — voir la
[page des releases](https://github.com/davidp57/walker/releases) pour les tags disponibles.

## Optionnel : SSO pour une instance partagée/hébergée

Par défaut (`WALKER_AUTH_MODE=none`), il n'y a pas de connexion — parfait pour une seule personne qui
s'auto-héberge pour elle-même. Si vous hébergez Walker pour une équipe et voulez que chacun se
connecte avec son propre compte (Google, Apple ou Microsoft), ajoutez ceci à la section
`environment` de la stack :

```yaml
    environment:
      WALKER_DATABASE_URL: sqlite:////data/walker.db
      WALKER_AUTH_MODE: sso
      WALKER_SESSION_SECRET: "<en générer un>"
      WALKER_GOOGLE_CLIENT_ID: "<depuis la Google Cloud Console>"
      WALKER_GOOGLE_CLIENT_SECRET: "<depuis la Google Cloud Console>"
      # ...et/ou WALKER_APPLE_CLIENT_ID/SECRET, WALKER_MICROSOFT_CLIENT_ID/SECRET
```

Voir le [guide de configuration SSO](sso.md) pour la configuration complète par fournisseur (y compris
les étapes de la Google Cloud Console), pourquoi HTTPS est indispensable pour que cela fonctionne, et
comment les coéquipiers finissent par partager — ou non — un catalogue de codes selon leur domaine de
messagerie.

## Mise à jour

**Stacks** → votre stack → **Pull and redeploy** (ou re-sélectionnez le tag d'image si vous en avez
épinglé un et voulez passer à une release plus récente). Le schéma de la base de données est mis à
jour automatiquement au démarrage — pas d'étape de migration manuelle.
