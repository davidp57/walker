import { IconStar } from './icons'

interface LogoProps {
  wink?: boolean
}

/** Sidebar brand: star badge + "Walker" wordmark + tagline. `wink` toggles the western accent. */
export function Logo({ wink = true }: LogoProps) {
  return (
    <div className="wk-brand">
      <div className={`wk-badge${wink ? '' : ' is-plain'}`}>
        <IconStar size={16} />
      </div>
      <div>
        <div className="wk-brand-name">Walker</div>
        <div className="wk-brand-sub">time &rarr; T&amp;E</div>
      </div>
    </div>
  )
}
