import type { SsoProvider } from '../lib/api'
import { Logo } from './Logo'

const PROVIDER_LABELS: Record<SsoProvider, string> = {
  google: 'Continue with Google',
  apple: 'Continue with Apple',
  microsoft: 'Continue with Microsoft',
}

interface LoginScreenProps {
  providers: SsoProvider[]
}

/**
 * Shown instead of the app when this hosted deployment requires SSO (ADR-0010) and the visitor
 * isn't signed in yet. Links are real page navigations (not fetch calls) — the provider's consent
 * screen and the callback redirect both need a full browser round trip.
 */
export function LoginScreen({ providers }: LoginScreenProps) {
  return (
    <div className="wk-login-screen">
      <div className="wk-login-card">
        <Logo />
        <p className="wk-login-copy">Sign in to continue.</p>
        {providers.length === 0 ? (
          <p className="wk-login-copy">
            No sign-in provider is configured for this deployment yet — contact whoever manages it.
          </p>
        ) : (
          <div className="wk-login-providers">
            {providers.map((provider) => (
              <a
                key={provider}
                className="wk-btn wk-btn-primary wk-login-provider-btn"
                href={`/api/auth/login/${provider}`}
              >
                {PROVIDER_LABELS[provider]}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
