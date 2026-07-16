import type { Activity, ReferenceCode, TimesheetCode } from '../types'

/**
 * Unified tiered code search (BIZ-049), shared by every code-selection surface.
 *
 * Results are grouped by **tier** first, then sorted by `name` (the project name / libellé) within
 * each tier — replacing the old number ordering. Tier 1 is the user-scope codes; Tier 2 is the
 * reference catalog (searched separately, since it's server-side). The `codeOnly`/`realOnly` options
 * shape Tier 1 per context (a Task or a virtual-code backing has no activity step; a virtual-code
 * backing may only point at a real code).
 */

/** A Tier-1 match: a user code plus the activities that matched (empty in `codeOnly` mode). */
export interface CodeMatch {
  code: TimesheetCode
  activities: Activity[]
}

interface SearchOptions {
  codeOnly?: boolean // pick the whole code, ignore activities (Tasks / virtual-code backing)
  realOnly?: boolean // Tier 1 = real codes only (virtual-code backing selector)
}

const byName = (a: { name: string }, b: { name: string }): number =>
  a.name.localeCompare(b.name) || 0

/**
 * Normalize a string for fuzzy matching (BIZ-073): lower-case, strip diacritics, and drop everything
 * that isn't a letter or digit. So "HRHUB" matches "HR Hub", "developpement" matches "Développement",
 * and "6149505" matches "N9/6149505/020" — spaces, case, accents, and punctuation are ignored.
 */
export function normalizeForSearch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/** Tier 1: the user's codes matching `query`, name-sorted. Fuzzy-matches number / name / label (+ activity). */
export function searchUserCodes(
  codes: TimesheetCode[],
  query: string,
  { codeOnly = false, realOnly = false }: SearchOptions = {},
): CodeMatch[] {
  const q = normalizeForSearch(query)
  const pool = realOnly ? codes.filter((c) => !c.isVirtual) : codes
  return pool
    .map((c) => {
      const codeMatch = normalizeForSearch(`${c.number} ${c.name} ${c.label}`).includes(q)
      const activities = codeOnly
        ? []
        : c.activities.filter(
            (a) => q === '' || codeMatch || normalizeForSearch(a.label).includes(q),
          )
      const matches = codeOnly ? q === '' || codeMatch : activities.length > 0
      return { code: c, activities, matches }
    })
    .filter((r) => r.matches)
    .sort((a, b) => byName(a.code, b.code))
    .map(({ code, activities }) => ({ code, activities }))
}

/** Tier 2: reference-catalog results not already active in the user's codes, name-sorted. */
export function sortReferenceByName(
  refs: ReferenceCode[],
  activeNumbers: Set<string>,
): ReferenceCode[] {
  return refs.filter((r) => !activeNumbers.has(r.number)).sort(byName)
}
