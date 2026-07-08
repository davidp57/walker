# Auto-hébergement : Docker

Walker est livré sous forme d'une unique image Docker contenant à la fois le backend et l'application
web compilée — il n'y a rien d'autre à installer.

## Démarrage rapide avec Docker Compose

Le dépôt inclut un `docker-compose.yml` prêt à l'emploi. Depuis un clone du dépôt :

```bash
docker compose up --build
```

Cela compile l'image, démarre le conteneur et publie l'application sur
[http://localhost:8000](http://localhost:8000). Vos données sont conservées dans un volume Docker
nommé (`walker-data`), de sorte qu'elles survivent aux redémarrages et reconstructions du conteneur.

## Exécuter l'image directement

Si vous préférez exécuter l'image publiée sans cloner le dépôt, la commande `docker run` équivalente
ressemble à ceci :

```bash
docker run -d \
  --name walker \
  -p 8000:8000 \
  -v walker-data:/data \
  ghcr.io/davidp57/walker:latest
```

Notez que `ghcr.io/davidp57/walker` est un paquet **privé** par défaut (un réglage de GitHub
Container Registry, indépendant de la visibilité du dépôt source) — `docker pull` nécessitera
`docker login ghcr.io` avec un jeton ayant la portée `read:packages`, à moins que le paquet n'ait été
rendu public. Voir le [guide Portainer](portainer.md#prerequis-visibilite-de-limage) pour savoir
comment vérifier ou modifier cela.

- `-p 8000:8000` publie l'application web sur le port 8000 — changez le premier nombre si vous voulez
  un port différent sur l'hôte (par ex. `-p 9000:8000`).
- `-v walker-data:/data` est l'emplacement du fichier de base de données SQLite ; sans lui, vos
  données sont perdues à la suppression du conteneur.

## Configuration

Walker lit sa configuration depuis des variables d'environnement. Les deux que vous êtes le plus
susceptible de toucher :

| Variable | Rôle | Valeur par défaut |
| --- | --- | --- |
| `WALKER_DATABASE_URL` | Où vit la base de données | `sqlite:////data/walker.db` dans le conteneur |
| `WALKER_FRONTEND_DIST` | Chemin de l'application web compilée (déjà correctement défini dans l'image) | `/app/frontend/dist` |

Vous ne devriez normalement avoir à changer ni l'une ni l'autre — elles sont préconfigurées pour
l'image de conteneur. Voir le `Dockerfile` et le `docker-compose.yml` du dépôt pour les valeurs par
défaut exactes intégrées à l'image.

## Mise à jour

Récupérez ou reconstruisez l'image plus récente et recréez le conteneur ; le schéma de la base de
données est mis à jour automatiquement au démarrage, il n'y a donc pas d'étape de migration manuelle.

```bash
docker compose pull
docker compose up -d
```
