import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MarkdownEditor } from './MarkdownEditor'

/**
 * Behaviour-level tests for the Task description editor (BIZ-024): paste markdown -> it renders as
 * rich structure, edit -> the serialised markdown reflects the change. These assert against the
 * rendered DOM and the `onChange` markdown payload, never against Milkdown/ProseMirror internals.
 */
describe('MarkdownEditor', () => {
  it('renders an initial markdown value as WYSIWYG structure', async () => {
    render(<MarkdownEditor value={'# Title\n\nSome **bold** text.'} onChange={vi.fn()} />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Title' })).toBeInTheDocument()
    const bold = await screen.findByText('bold')
    expect(bold.tagName.toLowerCase()).toBe('strong')
  })

  it('renders task-list checkboxes from markdown', async () => {
    render(<MarkdownEditor value={'- [ ] first\n- [x] second\n'} onChange={vi.fn()} />)

    const checkboxes = await screen.findAllByRole('checkbox')
    expect(checkboxes).toHaveLength(2)
    expect(checkboxes[0]).not.toBeChecked()
    expect(checkboxes[1]).toBeChecked()
  })

  it('renders fenced code blocks from markdown', async () => {
    render(<MarkdownEditor value={'```\nconst x = 1\n```'} onChange={vi.fn()} />)

    expect(await screen.findByText('const x = 1')).toBeInTheDocument()
  })

  it('shows the placeholder text when the description is empty', async () => {
    render(<MarkdownEditor value="" onChange={vi.fn()} placeholder="Markdown notes…" />)

    const editable = await screen.findByTestId('wk-markdown-editor')
    await waitFor(() => {
      expect(editable.querySelector('p.is-empty')).toHaveAttribute(
        'data-placeholder',
        'Markdown notes…',
      )
    })
  })

  it('clears the placeholder when text is pasted into an empty description', async () => {
    const user = userEvent.setup()
    render(<MarkdownEditor value="" onChange={vi.fn()} placeholder="Markdown notes…" />)

    const editable = await screen.findByTestId('wk-markdown-editor')
    await waitFor(() => expect(editable.querySelector('p.is-empty')).toBeInTheDocument())

    const editor = editable.querySelector('[contenteditable="true"]') as HTMLElement
    await user.click(editor)
    await user.paste('pasted content')

    await waitFor(() => {
      expect(editable.querySelector('p.is-empty')).not.toBeInTheDocument()
    })
  })

  it('clicking a task-list checkbox toggles it and serialises the change to markdown', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<MarkdownEditor value={'- [ ] todo item\n'} onChange={onChange} />)

    const checkbox = await screen.findByRole('checkbox')
    expect(checkbox).not.toBeChecked()

    await user.click(checkbox)

    expect(checkbox).toBeChecked()
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(expect.stringContaining('[x] todo item'))
    })
  })

  it('serialises typed content back to markdown via onChange', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<MarkdownEditor value="" onChange={onChange} />)

    const editable = await screen.findByTestId('wk-markdown-editor')
    const editor = editable.querySelector('[contenteditable="true"]') as HTMLElement
    await user.click(editor)
    await user.type(editor, 'Hello world')

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(expect.stringContaining('Hello world'))
    })
  })

  it('round-trips a full standard-feature markdown document', async () => {
    const markdown = [
      '# Heading',
      '',
      'Some *italic*, **bold**, and ~~struck~~ text with a [link](https://example.com).',
      '',
      '> A quote',
      '',
      '- bullet one',
      '- bullet two',
      '',
      '1. first',
      '2. second',
      '',
      '- [ ] todo item',
      '- [x] done item',
      '',
      'Inline `code` here.',
      '',
      '```',
      'block code',
      '```',
      '',
    ].join('\n')

    render(<MarkdownEditor value={markdown} onChange={vi.fn()} />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Heading' })).toBeInTheDocument()
    expect(await screen.findByText('A quote')).toBeInTheDocument()
    expect(await screen.findByText('bullet one')).toBeInTheDocument()
    expect(await screen.findByText('first')).toBeInTheDocument()
    expect(await screen.findByText('code')).toBeInTheDocument()
    expect(await screen.findByText('block code')).toBeInTheDocument()
    const link = await screen.findByRole('link', { name: 'link' })
    expect(link).toHaveAttribute('href', 'https://example.com')
    const checkboxes = await screen.findAllByRole('checkbox')
    expect(checkboxes).toHaveLength(2)
  })
})

describe('MarkdownEditor — opening links (BIZ-055)', () => {
  it('opens a link in a new tab on Cmd/Ctrl+click', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    render(<MarkdownEditor value={'[site](https://example.com)'} onChange={vi.fn()} />)

    const link = await screen.findByRole('link', { name: 'site' })
    fireEvent.click(link, { metaKey: true })

    expect(open).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener,noreferrer')
    open.mockRestore()
  })

  it('does not open on a plain click (so the link text stays editable)', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    render(<MarkdownEditor value={'[site](https://example.com)'} onChange={vi.fn()} />)

    const link = await screen.findByRole('link', { name: 'site' })
    fireEvent.click(link)

    expect(open).not.toHaveBeenCalled()
    open.mockRestore()
  })

  it('shows the URL as a title on hover', async () => {
    render(<MarkdownEditor value={'[site](https://example.com)'} onChange={vi.fn()} />)

    const link = await screen.findByRole('link', { name: 'site' })
    fireEvent.mouseOver(link)

    expect(link).toHaveAttribute('title', 'https://example.com')
  })
})
