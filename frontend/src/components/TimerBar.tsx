import { useLayoutEffect, useRef, useState } from 'react'
import type { ActivityName, SwitchTarget, TaskSuggestion, TimesheetCode } from '../types'
import { formatClock, formatStopwatch, parseMilitaryClock, selectOnFocus } from '../lib/time'
import { planSwitchLayout, type SwitchLayout } from '../lib/switchLayout'
import { SwitchBlocks } from './SwitchBlocks'
import { IconBreak, IconChecklist, IconPlay, IconStop } from './icons'

// Horizontal breathing room around the blocks, matching `.wk-timerbar`'s gap on either side.
const SWITCH_GUTTER = 28

interface TimerBarProps {
  running: boolean
  elapsedSeconds: number // parent ticks this every second while running
  description: string
  code: TimesheetCode | null
  activity: ActivityName | null
  suggestions: TaskSuggestion[] // computed by parent (scoped to code when set)
  onDescriptionChange: (value: string) => void
  onStart: () => void
  onStop: () => void
  onCancel: () => void // discard running / clear selection
  onSwitchTask: () => void // open Code picker
  onPickSuggestion: (s: TaskSuggestion) => void
  startMinute?: number | null // start of the running entry (minutes since midnight)
  onEditStart?: (minute: number) => void // adjust the running timer's start time
  // Enter in the description field (BIZ-009): starts a Timer carrying the typed description.
  // Only fires while stopped — Enter while running is a no-op (avoids a phantom double-start).
  onSubmitDescription?: () => void
  // The running entry's linked Task id, if any (BIZ-023) — when set, Stop splits into Stop |
  // Complete. `null`/`undefined` while stopped or when the running entry carries no Task.
  taskId?: string | null
  onComplete?: () => void // stop the Timer and mark the linked Task Done
  onInsertBreak?: () => void // BIZ-076: carve a past break out of the running session
  // BIZ-093: the codes the band offers, already capped by the `switch_count` preference and stripped
  // of the running code server-side. How many actually render is a matter of available width.
  switchTargets?: SwitchTarget[]
  onPickSwitchTarget?: (target: SwitchTarget, activity: ActivityName) => void
}

export function TimerBar({
  running,
  elapsedSeconds,
  description,
  code,
  activity,
  suggestions,
  onDescriptionChange,
  onStart,
  onStop,
  onCancel,
  onSwitchTask,
  onPickSuggestion,
  startMinute,
  onEditStart,
  onSubmitDescription,
  taskId,
  onComplete,
  onInsertBreak,
  switchTargets = [],
  onPickSwitchTarget,
}: TimerBarProps) {
  const [focused, setFocused] = useState(false)
  const showSuggestions = focused && suggestions.length > 0

  // BIZ-093: the bar's width decides how many blocks show, and whether the description field has to
  // take a line of its own. Measured rather than guessed from a media query, because the untouchable
  // tail (chip, clock, buttons) changes width with the Timer's state.
  const barRef = useRef<HTMLDivElement>(null)
  const tailRef = useRef<HTMLDivElement>(null)
  // `null` means "not measured yet" — the band then shows everything it was given rather than
  // nothing, so the first paint is never a flash of an empty row.
  const [layout, setLayout] = useState<SwitchLayout | null>(null)
  useLayoutEffect(() => {
    const bar = barRef.current
    if (!bar) return
    const measure = () => {
      // An unmeasurable bar (hidden, or a DOM without layout) keeps the last plan rather than
      // collapsing the band to nothing.
      if (bar.clientWidth <= 0) return
      setLayout(
        planSwitchLayout({
          barWidth: bar.clientWidth,
          reservedWidth: (tailRef.current?.offsetWidth ?? 0) + SWITCH_GUTTER,
          maxBlocks: switchTargets.length,
        }),
      )
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(bar)
    return () => observer.disconnect()
  }, [switchTargets.length, running, taskId, startMinute])
  const blocks = !onPickSwitchTarget
    ? []
    : layout
      ? switchTargets.slice(0, layout.blocks)
      : switchTargets

  const [editingStart, setEditingStart] = useState(false)
  const [startBuffer, setStartBuffer] = useState('')
  const commitStart = () => {
    const m = parseMilitaryClock(startBuffer)
    if (m != null && onEditStart) onEditStart(m)
    setEditingStart(false)
  }
  // BIZ-071: the whole running-clock area (not just the "since" line) opens the start-time editor.
  const canEditStart = running && startMinute != null && !!onEditStart
  const beginEditStart = () => {
    if (startMinute == null) return
    setStartBuffer(formatClock(startMinute))
    setEditingStart(true)
  }

  const hasTask = !!code
  const canCancel = running || hasTask || description.trim().length > 0
  const cancelTitle = running ? 'Cancel timer — discard, nothing saved' : 'Clear selection'
  const suggestTitle = hasTask ? `Recent on ${code!.name}` : 'Resume a recent task'

  return (
    <div
      ref={barRef}
      className={`wk-timerbar${running ? ' is-running' : ''}${layout?.stacked ? ' is-stacked' : ''}`}
    >
      <div className="wk-timer-input-wrap">
        <input
          className="wk-timer-input"
          value={description}
          placeholder="What are you working on?"
          onChange={(e) => onDescriptionChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !running) onSubmitDescription?.()
          }}
        />
        {showSuggestions && (
          <div className="wk-suggest">
            <div className="wk-suggest-title">{suggestTitle}</div>
            {suggestions.map((s, i) => (
              <button
                key={`${s.codeId ?? 'none'}-${i}`}
                type="button"
                className="wk-suggest-item"
                // mousedown + preventDefault keeps input focus so blur doesn't close first
                onMouseDown={(e) => {
                  e.preventDefault()
                  onPickSuggestion(s)
                }}
              >
                <span className="wk-dot" style={{ background: s.color }} />
                <span className="wk-suggest-body">
                  <span className="wk-suggest-desc">{s.description}</span>
                  <span className="wk-suggest-meta">
                    {s.codeId ? `${s.codeNumber} · ${s.codeName}` : 'Uncategorized'}
                    {s.activity ? ` · ${s.activity}` : ''}
                  </span>
                </span>
                <span className="wk-suggest-key">↵ fill</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {onPickSwitchTarget && <SwitchBlocks targets={blocks} onPick={onPickSwitchTarget} />}

      <div className="wk-timer-tail" ref={tailRef}>
        <button type="button" className="wk-taskchip" onClick={onSwitchTask}>
          <span className="wk-dot" style={{ background: code ? code.color : 'var(--wk-amber)' }} />
          <span style={{ textAlign: 'left' }}>
            <span className="wk-taskchip-main" style={{ display: 'block' }}>
              {code ? code.name : 'Uncategorized'}
            </span>
            <span className="wk-taskchip-sub" style={{ display: 'block' }}>
              {code ? (activity ?? 'pick an activity') : 'pick a code'}
            </span>
          </span>
          <span className="wk-taskchip-caret">code ⌄</span>
        </button>

        <div className="wk-timer-right">
          <span className={`wk-timer-dot${running ? ' is-running' : ''}`} />
          <div className="wk-timer-clock-wrap">
            {canEditStart && editingStart ? (
              <>
                <span className="wk-timer-clock is-running">{formatStopwatch(elapsedSeconds)}</span>
                <input
                  className="wk-input-inline"
                  autoFocus
                  value={startBuffer}
                  onFocus={selectOnFocus}
                  onChange={(e) => setStartBuffer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitStart()
                    if (e.key === 'Escape') setEditingStart(false)
                  }}
                  onBlur={commitStart}
                  style={{ width: 60 }}
                />
              </>
            ) : canEditStart ? (
              // The whole widget is the click target — clock + "since" line (BIZ-071).
              <button
                type="button"
                className="wk-timer-clock-edit"
                title="Edit the start time of the running timer"
                onClick={beginEditStart}
              >
                <span className="wk-timer-clock is-running">{formatStopwatch(elapsedSeconds)}</span>
                <span className="wk-timer-since">since {formatClock(startMinute)}</span>
              </button>
            ) : (
              <span className={`wk-timer-clock${running ? ' is-running' : ''}`}>
                {formatStopwatch(elapsedSeconds)}
              </span>
            )}
          </div>
        </div>

        {canCancel && (
          <button type="button" className="wk-btn-icon" title={cancelTitle} onClick={onCancel}>
            ✕
          </button>
        )}

        {running ? (
          <>
            {onInsertBreak && (
              <button
                type="button"
                className="wk-btn-icon"
                title="Insert a break — carve past non-worked time (e.g. lunch) out of this session"
                aria-label="Insert a break"
                onClick={onInsertBreak}
              >
                <IconBreak />
              </button>
            )}
            <button type="button" className="wk-btn wk-btn-danger" onClick={onStop}>
              <IconStop
                style={{ display: 'inline-block', verticalAlign: '-1px', marginRight: 6 }}
              />{' '}
              Stop
            </button>
            {taskId != null && (
              <button type="button" className="wk-btn wk-btn-primary" onClick={onComplete}>
                <IconChecklist
                  style={{ display: 'inline-block', verticalAlign: '-1px', marginRight: 6 }}
                />{' '}
                Complete
              </button>
            )}
          </>
        ) : (
          <button type="button" className="wk-btn wk-btn-primary" onClick={onStart}>
            <IconPlay style={{ display: 'inline-block', verticalAlign: '-1px', marginRight: 6 }} />{' '}
            Start
          </button>
        )}
      </div>
    </div>
  )
}
