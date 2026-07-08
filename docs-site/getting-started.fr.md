# Prise en main

Il y a trois façons d'exécuter Walker, selon votre situation.

## 1. Une instance hébergée

Si votre organisation exploite déjà une instance Walker partagée, c'est l'option la plus simple :
quelqu'un vous donne une URL, vous vous connectez, et c'est tout — aucune installation. Demandez
l'adresse à la personne qui l'a mise en place. (Les instances hébergées et multi-utilisateurs avec
connexion sont une capacité plus récente ; si vous n'en avez pas à disposition, utilisez plutôt l'une
des options auto-hébergées ci-dessous.)

## 2. Auto-hébergé avec Docker

Si vous disposez de Docker — sur votre propre machine, un serveur domestique ou un petit VPS — vous
pouvez exécuter Walker en conteneur avec une seule commande. C'est l'option recommandée si vous êtes à
l'aise avec Docker et souhaitez que vos données persistent entre les redémarrages et les mises à jour.

Voir [Auto-hébergement : Docker](self-hosting/docker.md) pour les commandes exactes.

## 3. Exécutable autonome `.exe` (Windows)

Si vous êtes sous Windows et ne voulez pas installer Docker, Python ni Node, téléchargez un unique
exécutable depuis la page Releases du projet, double-cliquez dessus, et Walker s'ouvre dans votre
navigateur. Pas d'environnement de développement, pas d'étape de compilation.

Voir [Auto-hébergement : Exécutable autonome .exe](self-hosting/standalone-exe.md) pour les détails.

## Laquelle choisir ?

| Situation | Option recommandée |
| --- | --- |
| Votre entreprise/équipe a déjà un Walker partagé | Instance hébergée |
| Vous voulez une instance personnelle persistante, toujours active | Docker |
| Vous voulez essayer Walker sous Windows sans aucune configuration | Exécutable autonome `.exe` |

Une fois Walker en marche, rendez-vous dans le [Guide au quotidien](guide.md) pour apprendre à suivre
votre temps et préparer votre feuille de temps.
