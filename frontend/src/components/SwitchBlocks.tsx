import { useState } from 'react'
import type { ActivityName, SwitchTarget } from '../types'

interface SwitchBlocksProps {
  targets: SwitchTarget[]
  onPick: (target: SwitchTarget, activity: ActivityName) => void
}

/**
 * The Switch blocks: one click per code to jump onto (BIZ-093, ADR-0016).
 *
 * A block shows a colour dot and the code name — nothing else, because the row competes for the
 * Timer bar's width and a truncated name still reads by its colour. The activity is implicit: a
 * plain click starts the one the server ranked. Codes with several activities reveal the rest in a
 * menu on hover or keyboard focus, which is a shortcut rather than the only way — the picker still
 * offers everything, so nothing is lost to a device that cannot hover.
 */
export function SwitchBlocks({ targets, onPick }: SwitchBlocksProps) {
  const [openId, setOpenId] = useState<string | null>(null)

  if (targets.length === 0) return null

  return (
    <div className="wk-switch">
      {targets.map((target) => {
        const hasMenu = target.activities.length > 1
        const open = hasMenu && openId === target.codeId
        return (
          <div
            key={target.codeId}
            className="wk-switch-block"
            data-testid={`switch-block-${target.codeId}`}
            onMouseEnter={() => setOpenId(target.codeId)}
            onMouseLeave={() =>
              setOpenId((current) => (current === target.codeId ? null : current))
            }
            onFocus={() => setOpenId(target.codeId)}
            onBlur={(e) => {
              // Moving between the block and its own menu must not close it.
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpenId(null)
            }}
          >
            <button
              type="button"
              className="wk-switch-main"
              title={`Switch to ${target.codeName} — ${target.codeNumber} · ${target.activity}`}
              onClick={() => onPick(target, target.activity)}
            >
              <span className="wk-dot" style={{ background: target.color }} />
              <span className="wk-switch-name">{target.codeName}</span>
            </button>
            {open && (
              <div className="wk-switch-menu" role="menu">
                {target.activities.map((activity) => (
                  <button
                    key={activity}
                    type="button"
                    role="menuitem"
                    className={`wk-switch-act${activity === target.activity ? ' is-default' : ''}`}
                    onClick={() => onPick(target, activity)}
                  >
                    {activity}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
