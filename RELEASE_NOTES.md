# Walker v1.0.1

A bug-fix and documentation release, no new features.

## Fixed

- **Free-mail domains no longer auto-join a shared Organization.** Previously, anyone signing in
  via SSO with a personal email (`gmail.com`, `outlook.com`, `icloud.com`, and similar providers)
  would land in an Organization shared with every other stranger using the same provider — seeing
  and sharing their real-code catalog. Personal email domains now get their own private setup,
  same as a standalone install. If you're running a hosted instance with SSO enabled for personal
  email providers, upgrading will separate any users who were previously (incorrectly) grouped
  together.

## Documentation

- New **Portainer self-hosting guide**: deploying the published `ghcr.io/davidp57/walker` image as
  a Portainer stack, including the GitHub Container Registry private-by-default gotcha.
- New **SSO configuration guide**: step-by-step Google Cloud Console setup, why HTTPS is mandatory
  for sign-in to work at all, and a pointer for Apple/Microsoft.
