import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createCode,
  createVirtualCode,
  fetchChecklist,
  fetchCodes,
  fetchEntries,
  fetchFortnight,
  fetchSettings,
  importCatalog,
  patchEntry,
} from './api'

describe('fetchCodes', () => {
  afterEach(() => vi.restoreAllMocks())

  it('maps GET /api/codes into TimesheetCode[] with string ids', async () => {
    const payload = [
      {
        id: 1,
        number: 'N9/1042',
        label: 'MNT - PAP V4',
        name: 'Paper V4',
        color: '#5b9cf6',
        activities: [{ code: '0001', label: 'Bug fixing' }],
        is_virtual: false,
        real_code_id: null,
        real_code_number: null,
      },
    ]
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const codes = await fetchCodes()

    expect(fetchMock).toHaveBeenCalledWith('/api/codes')
    expect(codes).toEqual([
      {
        id: '1',
        number: 'N9/1042',
        label: 'MNT - PAP V4',
        name: 'Paper V4',
        color: '#5b9cf6',
        activities: [{ code: '0001', label: 'Bug fixing' }],
        isVirtual: false,
        realCodeId: null,
        realCodeNumber: null,
      },
    ])
  })

  it('maps a virtual code, resolving its real-code link to a string id', async () => {
    const payload = [
      {
        id: 2,
        number: 'N9/1042',
        label: 'MNT - PAP V4',
        name: 'Workday contact info',
        color: '#abcdef',
        activities: [{ code: '0001', label: 'Bug fixing' }],
        is_virtual: true,
        real_code_id: 1,
        real_code_number: 'N9/1042',
      },
    ]
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 })),
    )

    const codes = await fetchCodes()

    expect(codes[0]).toMatchObject({
      isVirtual: true,
      realCodeId: '1',
      realCodeNumber: 'N9/1042',
    })
  })
})

describe('fetchEntries', () => {
  afterEach(() => vi.restoreAllMocks())

  it('maps entries to the SPA shape (string ids, minutes, null-safe fields)', async () => {
    const payload = [
      {
        id: 7,
        date: '2026-07-02',
        start_minute: 540,
        end_minute: 600,
        timesheet_code_id: 3,
        activity: 'Bug fixing',
        description: 'x',
      },
      {
        id: 8,
        date: '2026-07-02',
        start_minute: 610,
        end_minute: null,
        timesheet_code_id: null,
        activity: null,
        description: null,
      },
    ]
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 })),
    )

    const entries = await fetchEntries('2026-07-02')

    expect(fetch).toHaveBeenCalledWith('/api/entries?date=2026-07-02')
    expect(entries).toEqual([
      {
        id: '7',
        date: '2026-07-02',
        start: 540,
        end: 600,
        codeId: '3',
        activity: 'Bug fixing',
        description: 'x',
      },
      {
        id: '8',
        date: '2026-07-02',
        start: 610,
        end: null,
        codeId: null,
        activity: null,
        description: '',
      },
    ])
  })
})

describe('patchEntry', () => {
  afterEach(() => vi.restoreAllMocks())

  it('maps only the provided SPA fields into the API body', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: 7,
            date: '2026-07-02',
            start_minute: 540,
            end_minute: 600,
            timesheet_code_id: 3,
            activity: 'Bug fixing',
            description: 'x',
          }),
          { status: 200 },
        ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await patchEntry('7', { codeId: '3', end: 600 })

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/entries/7')
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body as string)).toEqual({ timesheet_code_id: 3, end_minute: 600 })
  })
})

describe('createCode', () => {
  afterEach(() => vi.restoreAllMocks())

  it('POSTs the code body (null-defaulted name/color) and returns a string-id code', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: 5,
            number: 'N9/1',
            label: 'L',
            name: 'L',
            color: '#111',
            activities: [],
            is_virtual: false,
            real_code_id: null,
            real_code_number: null,
          }),
          { status: 201 },
        ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const code = await createCode({
      number: 'N9/1',
      label: 'L',
      activities: [{ code: '0001', label: 'A' }],
    })

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/codes')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({
      number: 'N9/1',
      label: 'L',
      name: null,
      color: null,
      activities: [{ code: '0001', label: 'A' }],
    })
    expect(code.id).toBe('5')
  })
})

describe('createVirtualCode', () => {
  afterEach(() => vi.restoreAllMocks())

  it('POSTs the real code id (as a number) + name + color, and returns a string-id code', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: 9,
            number: 'N9/1',
            label: 'L',
            name: 'Sub-project',
            color: '#abcdef',
            activities: [],
            is_virtual: true,
            real_code_id: 5,
            real_code_number: 'N9/1',
          }),
          { status: 201 },
        ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const code = await createVirtualCode({ realCodeId: '5', name: 'Sub-project', color: '#abcdef' })

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/codes/virtual')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({
      real_code_id: 5,
      name: 'Sub-project',
      color: '#abcdef',
    })
    expect(code).toMatchObject({ id: '9', isVirtual: true, realCodeId: '5' })
  })
})

describe('fetchFortnight', () => {
  afterEach(() => vi.restoreAllMocks())

  it('maps the grid rows into a `${codeId}|${activity}` matrix with numeric day keys', async () => {
    const payload = {
      start: '2026-07-01',
      end: '2026-07-15',
      rows: [
        { timesheet_code_id: 3, activity: 'Bug fixing', minutes_by_day: { '1': 90, '2': 60 } },
      ],
    }
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 })),
    )

    const matrix = await fetchFortnight('2026-07-02')

    expect(fetch).toHaveBeenCalledWith('/api/fortnight/2026-07-02')
    expect(matrix).toEqual({ '3|Bug fixing': { 1: 90, 2: 60 } })
  })
})

describe('fetchChecklist', () => {
  afterEach(() => vi.restoreAllMocks())

  it('maps entered items into a `${codeId}|${activity}#${day}` map', async () => {
    const payload = {
      items: [
        { timesheet_code_id: 3, activity: 'Bug fixing', day: 1, entered: true },
        { timesheet_code_id: 3, activity: 'Bug fixing', day: 2, entered: false },
      ],
      entered: 1,
      total: 2,
    }
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 })),
    )

    const checked = await fetchChecklist('2026-07-02')

    expect(fetch).toHaveBeenCalledWith('/api/fortnight/2026-07-02/checklist')
    expect(checked).toEqual({ '3|Bug fixing#1': true })
  })
})

describe('fetchSettings', () => {
  afterEach(() => vi.restoreAllMocks())

  it('maps the settings payload (work rhythm, density, absences)', async () => {
    const payload = {
      workdays: [false, true, true, true, true, true, false],
      density: 'compact',
      absences: [{ date: '2026-07-14', reason: 'Annual leave' }],
    }
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 })),
    )

    const settings = await fetchSettings()

    expect(fetch).toHaveBeenCalledWith('/api/settings')
    expect(settings).toEqual({
      workdays: [false, true, true, true, true, true, false],
      density: 'compact',
      absences: [{ date: '2026-07-14', reason: 'Annual leave' }],
    })
  })
})

describe('importCatalog', () => {
  afterEach(() => vi.restoreAllMocks())

  it('POSTs the file as multipart form data and returns the summary', async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ created: 2, updated: 0 }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await importCatalog(new File(['csv'], 'catalog.csv', { type: 'text/csv' }))

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/catalog/import')
    expect(init.method).toBe('POST')
    expect(init.body).toBeInstanceOf(FormData)
    expect(result).toEqual({ created: 2, updated: 0 })
  })
})
