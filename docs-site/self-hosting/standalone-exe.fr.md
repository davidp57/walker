# Auto-hébergement : Exécutable autonome `.exe` (Windows)

Pour les utilisateurs Windows qui ne veulent pas installer Docker, Python ni Node, Walker est aussi
publié sous forme d'un programme autonome, en deux conditionnements.

!!! warning "Deux téléchargements, parce que les antivirus s'en mêlent parfois"

    `walker.exe` est un fichier unique qui se décompresse lui-même en mémoire au démarrage. C'est
    très pratique — et, vu par une heuristique d'antivirus, impossible à distinguer du procédé
    qu'emploient les vrais logiciels malveillants pour se dissimuler. Microsoft Defender l'a déjà mis
    en quarantaine. Cela ne dit rien de la dangerosité du fichier, mais nous n'avons aucun moyen de
    le prouver à votre antivirus.

    D'où un second téléchargement, `walker-<version>-windows.zip` : le même programme, avec ses
    dépendances dans un dossier à côté de lui plutôt que cachées à l'intérieur. Plus rien ne se
    décompresse au démarrage, ce qui a beaucoup moins de chances d'alerter quoi que ce soit. Le prix
    à payer : une décompression.

    **Commencez par `walker.exe`. S'il disparaît, se fait bloquer ou refuse de démarrer, prenez le
    `.zip`.** Les deux conservent vos données au même endroit : vous pouvez passer de l'un à l'autre
    à tout moment sans rien perdre.

!!! note
    La version autonome est produite par son propre pipeline de release. Si vous n'en voyez pas
    encore sur la page Releases, utilisez l'[option Docker](docker.md) en attendant.

## Télécharger et exécuter

1. Allez sur la [page des releases](https://github.com/davidp57/Walker/releases) du projet sur GitHub.
2. Téléchargez l'un des deux fichiers attachés à la dernière release :
    - `walker.exe` — un seul fichier, rien à décompresser.
    - `walker-<version>-windows.zip` — la version en dossier, décrite ci-dessous.
3. Double-cliquez sur `walker.exe`.

C'est tout — pas d'installateur, pas de droits administrateur, pas de configuration de base de données
séparée. Au premier lancement, Walker démarre son propre serveur web local et ouvre automatiquement
votre navigateur par défaut pointé sur l'application en marche (`http://localhost:8000`). Une fenêtre
de console reste ouverte en arrière-plan pendant que Walker tourne ; la fermer arrête l'application.

### Utiliser la version `.zip`

L'archive contient un unique dossier `walker` avec `walker.exe` et un dossier `_internal` à côté.
**Ils vont ensemble** : sorti de ce dossier, `walker.exe` seul ne démarrera pas.

1. **Débloquez l'archive avant de la décompresser.** Windows marque tout ce qui vient d'Internet, et
   cette marque est recopiée sur chaque fichier extrait — c'est elle qui déclenche un avertissement
   (ou l'intervention de votre antivirus) sur chacun d'eux. Clic droit sur le `.zip` →
   **Propriétés** → cochez **Débloquer** en bas → **OK**. Le faire une fois sur l'archive évite de
   le faire sur son contenu.

    En PowerShell, la même chose :

    ```powershell
    Unblock-File "$env:USERPROFILE\Downloads\walker-<version>-windows.zip"
    ```

2. **Décompressez-la** à un endroit durable — pas le dossier Téléchargements, que vous finirez par
   vider. Quelque chose comme `C:\Users\<vous>\Programs\` convient ; aucun droit administrateur
   n'est nécessaire.
3. **Ouvrez le dossier `walker` et double-cliquez sur `walker.exe`.** Le comportement est identique
   à la version en fichier unique : il sert sur `http://localhost:8000` et ouvre votre navigateur.
4. **Facultatif — épinglez-le.** Clic droit sur `walker.exe` → *Épingler à la barre des tâches*, ou
   clic droit → *Envoyer vers* → *Bureau (créer un raccourci)*. Un raccourci pointe vers le fichier
   là où il se trouve : ne déplacez plus le dossier ensuite.

**Pour mettre à jour**, téléchargez la nouvelle archive, décompressez-la et remplacez **tout** le
dossier `walker` — pas seulement `walker.exe`, puisque `_internal` change avec lui. Fermez Walker
d'abord : Windows refuse d'écraser un programme en cours d'exécution. Vos données ne sont concernées
par rien de tout cela (voir plus bas).

Si Windows affiche *« Windows a protégé votre ordinateur »* au démarrage, c'est SmartScreen qui
réagit à un programme qu'il n'a jamais vu, pas un verdict sur le fichier : cliquez sur **Informations
complémentaires** → **Exécuter quand même**.

!!! tip "Si votre antivirus le supprime"

    Un téléchargement mis en quarantaine, c'est presque toujours le `walker.exe` en fichier unique,
    jugé sur la *façon* dont il démarre plutôt que sur ce qu'il fait. Par ordre d'effort croissant :

    - **Utilisez le `.zip` à la place.** Il n'a pas le comportement qui déclenche l'alerte.
    - **Signalez le faux positif** à Microsoft sur
      [WDSI file submission](https://www.microsoft.com/en-us/wdsi/filesubmission). Cela débloque en
      général le fichier concerné sous un jour ou deux — mais chaque nouvelle version de Walker est
      un fichier entièrement neuf, sans réputation propre, et tout recommence.
    - **Restaurez-le depuis la quarantaine.** Sur une machine personnelle, c'est votre décision. Sur
      un poste géré par un employeur, c'est celle de votre service informatique — et le faire
      vous-même peut déclencher une alerte.


## Le démarrer sans ouvrir de navigateur

Ouvrir un navigateur est ce qu'on attend d'un double-clic, et rarement ce qu'on veut ailleurs —
depuis un terminal, depuis une tâche planifiée, ou quand vous relancez Walker alors qu'il est déjà
ouvert dans un onglet. Passez `--no-browser` (ou `-B`) pour l'éviter :

```
walker.exe --no-browser
```

Walker affiche toujours l'adresse sur laquelle il sert, libre à vous de l'ouvrir quand vous voulez.

## Où vivent vos données

La version autonome conserve sa base de données SQLite dans votre profil utilisateur Windows
(`%APPDATA%\Walker\walker.db`), pas à côté de l'exécutable lui-même. Cela signifie que :

- Vous pouvez déplacer, renommer ou supprimer le fichier `.exe` sans perdre vos données.
- Télécharger un `.exe` plus récent et l'exécuter reprend automatiquement vos données existantes —
  tout changement de schéma est appliqué en arrière-plan au démarrage, si bien que mettre à jour ne
  signifie jamais repartir de zéro.
- **Les deux téléchargements partagent cette base.** Passer de `walker.exe` au `.zip` (ou l'inverse)
  ne change rien à vos codes, vos saisies ni votre historique.

## Quand préférer ceci à Docker

L'exécutable autonome `.exe` est le moyen le plus rapide d'essayer Walker ou de l'exécuter de façon
permanente sur une machine Windows personnelle sans rien d'autre d'installé. Si vous voulez exécuter
Walker sur un serveur, le partager avec d'autres, ou si vous n'êtes pas sous Windows, utilisez plutôt
l'[option Docker](docker.md).
