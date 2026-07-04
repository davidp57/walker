import { describe, expect, it } from 'vitest'
import { resolveChecklistRows } from './checklist'
import type { FortnightRow, TimesheetCode } from '../types'
import fixture from '../../../tests/fixtures/virtual_code_resolution.json'

/**
 * Contract test (TEC-004): asserts `resolveChecklistRows` reproduces the same virtual-code ->
 * real-code resolution (ADR-0008) as the backend's `resolve_to_real_codes`, using the fixture
 * shared with `tests/test_virtual_code_resolution_contract.py`. If this test and its backend
 * counterpart both pass but disagree on the fixture's expected output, the fixture itself is
 * wrong; if only one fails, the two implementations have diverged.
 */

interface FixtureCode {
  id: number
  real_code_id: number | null
}

interface FixtureRow {
  timesheet_code_id: number
  activity: string
  minutes_by_day: Record<string, number>
}

interface Fixture {
  codes: FixtureCode[]
  rows: FixtureRow[]
  expected_resolved_rows: FixtureRow[]
}

const data = fixture as Fixture

function toTimesheetCode(code: FixtureCode): TimesheetCode {
  return {
    id: String(code.id),
    number: 'N9/1',
    label: 'L',
    name: `code-${code.id}`,
    color: '#111',
    activities: [],
    isVirtual: code.real_code_id !== null,
    realCodeId: code.real_code_id === null ? null : String(code.real_code_id),
    realCodeNumber: null,
  }
}

describe('resolveChecklistRows contract with backend resolve_to_real_codes', () => {
  const codesById: Record<string, TimesheetCode> = {}
  data.codes.forEach((code) => {
    codesById[String(code.id)] = toTimesheetCode(code)
  })

  const rows: FortnightRow[] = data.rows.map((row) => ({
    key: `${row.timesheet_code_id}|${row.activity}`,
    code: codesById[String(row.timesheet_code_id)],
    activity: row.activity,
    minutesByDay: Object.fromEntries(
      Object.entries(row.minutes_by_day).map(([day, minutes]) => [Number(day), minutes]),
    ),
  }))

  it('matches the fixture expected_resolved_rows exactly', () => {
    const resolved = resolveChecklistRows(rows, codesById)

    const actual = resolved
      .map((row) => ({
        timesheet_code_id: Number(row.code.id),
        activity: row.activity,
        minutes_by_day: row.minutesByDay,
      }))
      .sort(
        (a, b) => a.timesheet_code_id - b.timesheet_code_id || a.activity.localeCompare(b.activity),
      )

    const expected = [...data.expected_resolved_rows].sort(
      (a, b) => a.timesheet_code_id - b.timesheet_code_id || a.activity.localeCompare(b.activity),
    )

    expect(actual).toEqual(
      expected.map((row) => ({
        timesheet_code_id: row.timesheet_code_id,
        activity: row.activity,
        minutes_by_day: Object.fromEntries(
          Object.entries(row.minutes_by_day).map(([day, minutes]) => [Number(day), minutes]),
        ),
      })),
    )
  })
})
