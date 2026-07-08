# Auto-hébergement : configurer le SSO

Le SSO (`WALKER_AUTH_MODE=sso`) est destiné à un déploiement **partagé et hébergé** où plusieurs
personnes utiliseront la même instance Walker et où chacune doit se connecter en tant qu'elle-même. Il
nécessite d'enregistrer une application OAuth auprès de chaque fournisseur que vous souhaitez proposer
— Walker ne peut pas faire cette partie à votre place.

!!! warning "HTTPS est requis, pas optionnel"
    Le cookie de session de Walker est posé avec l'attribut `Secure`, si bien que les navigateurs
    refusent silencieusement de le stocker en HTTP simple. Le SSO *semblera* fonctionner — l'écran de
    consentement du fournisseur et la redirection aboutissent tous deux — mais vous reviendrez sur
    Walker toujours déconnecté, ou obtiendrez immédiatement un 401 depuis `/api/auth/me`. Placez un
    reverse proxy avec un vrai certificat TLS (Traefik, Caddy, nginx, le reverse proxy intégré de
    Synology, ...) devant Walker avant d'activer le mode `sso` ; un déploiement nu
    `http://<ip>:8000` ne peut pas fonctionner avec le SSO, quelle que soit la configuration des
    applications côté fournisseur.

!!! warning "Derrière un reverse proxy, Walker doit être informé que le vrai schéma est HTTPS"
    Si le reverse proxy termine le TLS et transmet à Walker en HTTP simple en interne (le montage
    normal), Walker construit le `redirect_uri` OAuth à partir de ce que *lui* voit — du HTTP simple —
    à moins qu'il ne fasse confiance à l'en-tête `X-Forwarded-Proto` du proxy. Symptôme : Google
    rejette la connexion avec `Error 400: redirect_uri_mismatch`, et le lien « error details » montre
    un `redirect_uri` commençant par `http://` alors même que vous naviguez en `https://`. Le point
    d'entrée serveur de Walker fait déjà confiance aux en-têtes transmis par n'importe quel pair
    (`forwarded_allow_ips="*"` dans `uvicorn.run`, sans danger ici puisque Walker est censé se trouver
    derrière exactement un proxy de confiance) — assurez-vous que votre reverse proxy envoie bien
    `X-Forwarded-Proto: https` (celui de Synology et la plupart des autres le font par défaut).

## Google

1. Allez sur la [Google Cloud Console](https://console.cloud.google.com/) et créez un projet (ou
   choisissez-en un existant) pour ce déploiement de Walker.
2. **APIs & Services → OAuth consent screen** : configurez-le si ce n'est pas déjà fait.
   - **User type** : *External* (à moins que chaque futur utilisateur ne soit dans une organisation
     Google Workspace que vous contrôlez, auquel cas *Internal* est plus simple et évite la
     vérification).
   - Nom de l'app, e-mail de support, etc. — cosmétique, affiché sur l'écran de consentement.
   - **Scopes** : aucun à ajouter manuellement ; Walker demande `openid email profile` au moment de
     la connexion.
   - Si vous avez choisi *External* et restez au statut de publication « Testing », seuls les
     utilisateurs de test que vous ajoutez explicitement peuvent se connecter — ajoutez-vous ainsi
     que toute autre personne à qui vous voulez le faire essayer, ou publiez l'app (aucune revue
     Google n'est requise pour ces scopes de base).
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
   - **Application type** : *Web application*.
   - **Authorized redirect URIs** : ajoutez exactement

     ```
     https://<votre-domaine>/api/auth/callback/google
     ```

     Faites correspondre précisément le schéma et l'hôte de votre déploiement réel (`https://`, pas de
     barre oblique finale) — c'est le chemin fixe que le backend de Walker enregistre pour le callback
     de Google (`src/walker/api/routers/auth.py`) ; une incohérence ici est la cause la plus fréquente
     d'une erreur `redirect_uri_mismatch` de Google.
4. Enregistrez. Google affiche un **Client ID** et un **Client secret** — copiez les deux.
5. Définissez-les sur votre déploiement :

   ```yaml
   environment:
     WALKER_AUTH_MODE: sso
     WALKER_SESSION_SECRET: "<en générer un — voir ci-dessous>"
     WALKER_GOOGLE_CLIENT_ID: "<client ID de l'étape 4>"
     WALKER_GOOGLE_CLIENT_SECRET: "<client secret de l'étape 4>"
   ```

6. Redémarrez/redéployez Walker, puis ouvrez `https://<votre-domaine>/api/auth/login/google` — vous
   devriez arriver sur l'écran de consentement de Google, puis être redirigé, connecté.

Seuls les comptes Google avec un e-mail **vérifié** sont acceptés (Walker rejette la connexion sinon) ;
c'est pour ainsi dire toujours le cas des vrais comptes Google.

### Ce qui se passe à la première connexion Google

Walker trouve-ou-crée un `User` par l'e-mail connecté, sans étape d'inscription séparée :

- Les e-mails sur un domaine d'entreprise/personnalisé (par ex. `alice@acme.com`) rejoignent
  automatiquement l'Organisation partagée de ce domaine, la créant si c'est la première personne de
  `acme.com` à se connecter — chaque coéquipier du même domaine voit alors le même catalogue de codes
  réels.
- Les e-mails d'un fournisseur personnel/gratuit (`gmail.com`, `outlook.com`, `icloud.com`, et
  similaires — voir `services/organization.py` pour la liste complète) ne rejoignent ni ne créent
  jamais d'Organisation partagée ; chacun de ces utilisateurs obtient son propre catalogue privé,
  comme une installation autonome.

Il n'y a pas de flux d'invitation ni de rôles — quiconque peut compléter l'écran de consentement pour
un domaine accepté obtient un compte.

## Générer `WALKER_SESSION_SECRET`

Ceci signe le cookie de session ; la valeur par défaut livrée (`dev-insecure-secret-change-me`) n'est
sûre que pour le développement local. Générez-en une vraie par déploiement :

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Gardez-la à l'écart de tout ce que vous partagez (une **variable d'environnement de stack** Portainer
plutôt que collée directement dans le texte du compose, si d'autres peuvent voir la stack) —
quiconque possède cette valeur peut forger une session valide pour n'importe quel identifiant
d'utilisateur.

## Apple et Microsoft

Tous deux suivent la même forme générale que Google — enregistrez une application auprès du
fournisseur, obtenez une paire client ID/secret, définissez la paire correspondante
`WALKER_APPLE_CLIENT_ID`/`WALKER_APPLE_CLIENT_SECRET` ou
`WALKER_MICROSOFT_CLIENT_ID`/`WALKER_MICROSOFT_CLIENT_SECRET`, et enregistrez la même forme d'URI de
redirection (`https://<votre-domaine>/api/auth/callback/apple` ou `.../callback/microsoft`) auprès de
ce fournisseur. Vous n'avez besoin de configurer que les fournisseurs que vous voulez réellement
proposer ; laissez les autres vides.
