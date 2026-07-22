import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  completeTask,
  completeTimer,
  createCode,
  createTask,
  createVirtualCode,
  deleteTask,
  fetchChecklist,
  fetchCodes,
  fetchEntries,
  fetchPeriod,
  fetchSettings,
  fetchTaskTags,
  fetchTasks,
  importCatalog,
  patchEntry,
  switchTimer,
  updateSettings,
  updateTask,
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
        backingOnly: false,
        customer: null,
        type: null,
      },
    ])
  })

  it('maps the T&E ordering keys (customer/type) when present (BIZ-068)', async () => {
    const payload = [
      {
        id: 3,
        number: 'N9/1042',
        label: 'MNT - PAP V4',
        name: 'Paper V4',
        color: '#5b9cf6',
        activities: [],
        is_virtual: false,
        real_code_id: null,
        real_code_number: null,
        customer: 'PricewaterhouseCoopers',
        type: 'N',
      },
    ]
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 })),
    )

    const codes = await fetchCodes()

    expect(codes[0]).toMatchObject({ customer: 'PricewaterhouseCoopers', type: 'N' })
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
        task_id: null,
        source: 'timer',
      },
      {
        id: 8,
        date: '2026-07-02',
        start_minute: 610,
        end_minute: null,
        timesheet_code_id: null,
        activity: null,
        description: null,
        task_id: 5,
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
        taskId: null,
        source: 'timer',
      },
      {
        id: '8',
        date: '2026-07-02',
        start: 610,
        end: null,
        codeId: null,
        activity: null,
        description: '',
        taskId: '5',
        source: null,
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

  it('maps the taskId field into task_id (BIZ-023)', async () => {
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
            task_id: 5,
          }),
          { status: 200 },
        ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const entry = await patchEntry('7', { taskId: '5' })

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(init.body as string)).toEqual({ task_id: 5 })
    expect(entry.taskId).toBe('5')
  })
})

describe('switchTimer', () => {
  afterEach(() => vi.restoreAllMocks())

  it('sends taskId as task_id and maps it back on the new entry (BIZ-023)', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: 11,
            date: '2026-07-02',
            start_minute: 540,
            end_minute: null,
            timesheet_code_id: 3,
            activity: 'Bug fixing',
            description: 'Renew passport',
            task_id: 5,
          }),
          { status: 201 },
        ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const entry = await switchTimer({
      codeId: '3',
      activity: 'Bug fixing',
      description: 'Renew passport',
      taskId: '5',
    })

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/timer/switch')
    expect(JSON.parse(init.body as string)).toEqual({
      timesheet_code_id: 3,
      activity: 'Bug fixing',
      description: 'Renew passport',
      task_id: 5,
    })
    expect(entry.taskId).toBe('5')
  })
})

describe('completeTimer', () => {
  afterEach(() => vi.restoreAllMocks())

  it('POSTs /api/timer/complete and maps the closed entry', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: 11,
            date: '2026-07-02',
            start_minute: 540,
            end_minute: 600,
            timesheet_code_id: 3,
            activity: 'Bug fixing',
            description: 'Renew passport',
            task_id: 5,
          }),
          { status: 200 },
        ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const entry = await completeTimer()

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/timer/complete')
    expect(init.method).toBe('POST')
    expect(entry.end).toBe(600)
    expect(entry.taskId).toBe('5')
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

describe('fetchPeriod', () => {
  afterEach(() => vi.restoreAllMocks())

  it('maps the grid rows into minutes + manual matrices with numeric day keys', async () => {
    const payload = {
      start: '2026-07-01',
      end: '2026-07-15',
      rows: [
        {
          timesheet_code_id: 3,
          activity: 'Bug fixing',
          minutes_by_day: { '1': 90, '2': 60 },
          manual_by_day: { '1': true, '2': false },
        },
      ],
      uncategorized_by_day: { '2': 45 },
    }
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 })),
    )

    const { minutes, manual, uncategorizedByDay } = await fetchPeriod('2026-07-02')

    expect(fetch).toHaveBeenCalledWith('/api/period/2026-07-02')
    expect(minutes).toEqual({ '3|Bug fixing': { 1: 90, 2: 60 } })
    expect(manual).toEqual({ '3|Bug fixing': { 1: true, 2: false } })
    expect(uncategorizedByDay).toEqual({ 2: 45 }) // BIZ-070: numeric day keys
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

    expect(fetch).toHaveBeenCalledWith('/api/period/2026-07-02/checklist')
    expect(checked).toEqual({ '3|Bug fixing#1': true })
  })
})

describe('fetchSettings', () => {
  afterEach(() => vi.restoreAllMocks())

  it('maps the settings payload (work rhythm, density, period scheme, theme, absences)', async () => {
    const payload = {
      workdays: [false, true, true, true, true, true, false],
      density: 'compact',
      period_scheme: 'monthly',
      theme: 'light',
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
      periodScheme: 'monthly',
      theme: 'light',
      absences: [{ date: '2026-07-14', reason: 'Annual leave' }],
    })
  })
})

describe('updateSettings', () => {
  afterEach(() => vi.restoreAllMocks())

  it('sends the period scheme and maps it back from the response', async () => {
    const payload = {
      workdays: [false, true, true, true, true, true, false],
      density: 'comfortable',
      period_scheme: 'weekly',
      theme: 'system',
      absences: [],
    }
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const settings = await updateSettings(
      [false, true, true, true, true, true, false],
      'comfortable',
      'weekly',
    )

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/settings')
    expect(init.method).toBe('PUT')
    expect(JSON.parse(init.body as string)).toEqual({
      workdays: [false, true, true, true, true, true, false],
      density: 'comfortable',
      period_scheme: 'weekly',
    })
    expect(settings.periodScheme).toBe('weekly')
  })

  it('omits period_scheme when not provided, leaving the server-side scheme unchanged', async () => {
    const payload = {
      workdays: [false, true, true, true, true, true, false],
      density: 'comfortable',
      period_scheme: 'semi_monthly',
      theme: 'system',
      absences: [],
    }
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await updateSettings([false, true, true, true, true, true, false], 'comfortable')

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    const body = JSON.parse(init.body as string) as Record<string, unknown>
    expect('period_scheme' in body).toBe(false)
  })

  it('sends the theme and maps it back from the response', async () => {
    const payload = {
      workdays: [false, true, true, true, true, true, false],
      density: 'comfortable',
      period_scheme: 'semi_monthly',
      theme: 'light',
      absences: [],
    }
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const settings = await updateSettings(
      [false, true, true, true, true, true, false],
      'comfortable',
      undefined,
      'light',
    )

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(init.body as string)).toEqual({
      workdays: [false, true, true, true, true, true, false],
      density: 'comfortable',
      theme: 'light',
    })
    expect(settings.theme).toBe('light')
  })

  it('omits theme when not provided, leaving the server-side theme unchanged', async () => {
    const payload = {
      workdays: [false, true, true, true, true, true, false],
      density: 'comfortable',
      period_scheme: 'semi_monthly',
      theme: 'system',
      absences: [],
    }
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await updateSettings([false, true, true, true, true, true, false], 'comfortable')

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    const body = JSON.parse(init.body as string) as Record<string, unknown>
    expect('theme' in body).toBe(false)
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

describe('fetchTasks', () => {
  afterEach(() => vi.restoreAllMocks())

  it('maps GET /api/tasks into Task[] with string ids', async () => {
    const payload = [
      {
        id: 1,
        title: 'Renew passport',
        description: null,
        status: 'todo',
        priority: null,
        due_date: null,
        tags: [],
        timesheet_code_id: null,
        recurrence_rule: null,
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-01T00:00:00Z',
      },
    ]
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const tasks = await fetchTasks()

    expect(fetchMock).toHaveBeenCalledWith('/api/tasks')
    expect(tasks).toEqual([
      {
        id: '1',
        title: 'Renew passport',
        description: '',
        status: 'todo',
        priority: null,
        dueDate: null,
        tags: [],
        codeId: null,
        recurrenceRule: null,
        createdAt: '2026-07-01T00:00:00Z',
        updatedAt: '2026-07-01T00:00:00Z',
      },
    ])
  })

  it('maps a period-relative recurrence rule, converting offset_days to offsetDays', async () => {
    const payload = [
      {
        id: 2,
        title: 'Key in Timesheet system',
        description: null,
        status: 'todo',
        priority: null,
        due_date: '2026-07-15',
        tags: [],
        timesheet_code_id: null,
        recurrence_rule: { kind: 'period_relative', anchor: 'end', offset_days: -1 },
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-01T00:00:00Z',
      },
    ]
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const tasks = await fetchTasks()

    expect(tasks[0].recurrenceRule).toEqual({
      kind: 'period_relative',
      anchor: 'end',
      offsetDays: -1,
    })
  })
})

describe('createTask', () => {
  afterEach(() => vi.restoreAllMocks())

  it('POSTs the task body with defaults and maps the response back', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: 3,
            title: 'Fix bug',
            description: 'notes',
            status: 'in_progress',
            priority: 'high',
            due_date: '2026-07-15',
            tags: ['urgent'],
            timesheet_code_id: 9,
            recurrence_rule: null,
            created_at: '2026-07-01T00:00:00Z',
            updated_at: '2026-07-01T00:00:00Z',
          }),
          { status: 201 },
        ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const task = await createTask({
      title: 'Fix bug',
      description: 'notes',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2026-07-15',
      tags: ['urgent'],
      codeId: '9',
    })

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/tasks')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({
      title: 'Fix bug',
      description: 'notes',
      status: 'in_progress',
      priority: 'high',
      due_date: '2026-07-15',
      tags: ['urgent'],
      timesheet_code_id: 9,
      recurrence_rule: null,
    })
    expect(task.id).toBe('3')
    expect(task.codeId).toBe('9')
  })

  it('defaults optional fields when omitted (orphan task)', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: 4,
            title: 'Just a title',
            description: null,
            status: 'todo',
            priority: null,
            due_date: null,
            tags: [],
            timesheet_code_id: null,
            recurrence_rule: null,
            created_at: '2026-07-01T00:00:00Z',
            updated_at: '2026-07-01T00:00:00Z',
          }),
          { status: 201 },
        ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await createTask({ title: 'Just a title' })

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(init.body as string)).toEqual({
      title: 'Just a title',
      description: null,
      status: 'todo',
      priority: null,
      due_date: null,
      tags: [],
      timesheet_code_id: null,
      recurrence_rule: null,
    })
  })

  it('sends a period-relative recurrence rule with offset_days snake_case', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: 5,
            title: 'Key in Timesheet system',
            description: null,
            status: 'todo',
            priority: null,
            due_date: null,
            tags: [],
            timesheet_code_id: null,
            recurrence_rule: { kind: 'period_relative', anchor: 'start', offset_days: 1 },
            created_at: '2026-07-01T00:00:00Z',
            updated_at: '2026-07-01T00:00:00Z',
          }),
          { status: 201 },
        ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await createTask({
      title: 'Key in Timesheet system',
      recurrenceRule: { kind: 'period_relative', anchor: 'start', offsetDays: 1 },
    })

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    const body = JSON.parse(init.body as string) as Record<string, unknown>
    expect(body.recurrence_rule).toEqual({
      kind: 'period_relative',
      anchor: 'start',
      offset_days: 1,
    })
  })
})

describe('updateTask', () => {
  afterEach(() => vi.restoreAllMocks())

  it('PUTs the task body to /api/tasks/{id}', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: 3,
            title: 'Updated',
            description: null,
            status: 'done',
            priority: null,
            due_date: null,
            tags: [],
            timesheet_code_id: null,
            recurrence_rule: null,
            created_at: '2026-07-01T00:00:00Z',
            updated_at: '2026-07-02T00:00:00Z',
          }),
          { status: 200 },
        ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await updateTask('3', { title: 'Updated', status: 'done' })

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/tasks/3')
    expect(init.method).toBe('PUT')
  })
})

describe('completeTask', () => {
  afterEach(() => vi.restoreAllMocks())

  it('POSTs to /api/tasks/{id}/complete and maps the rolled-forward task back', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: 3,
            title: 'Key in Timesheet system',
            description: null,
            status: 'todo',
            priority: null,
            due_date: '2026-07-15',
            tags: [],
            timesheet_code_id: null,
            recurrence_rule: { kind: 'every_n_days', n: 14 },
            created_at: '2026-07-01T00:00:00Z',
            updated_at: '2026-07-01T00:00:00Z',
          }),
          { status: 200 },
        ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const task = await completeTask('3')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/tasks/3/complete',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(task.status).toBe('todo')
    expect(task.dueDate).toBe('2026-07-15')
  })
})

describe('deleteTask', () => {
  afterEach(() => vi.restoreAllMocks())

  it('DELETEs /api/tasks/{id}', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await deleteTask('3')

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/tasks/3')
    expect(init.method).toBe('DELETE')
  })
})

describe('fetchTaskTags', () => {
  afterEach(() => vi.restoreAllMocks())

  it('GETs /api/tasks/tags and returns the raw string list', async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify(['backend', 'urgent']), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const tags = await fetchTaskTags()

    expect(fetchMock).toHaveBeenCalledWith('/api/tasks/tags')
    expect(tags).toEqual(['backend', 'urgent'])
  })
})
