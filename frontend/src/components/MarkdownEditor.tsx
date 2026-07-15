import { Editor, rootCtx, defaultValueCtx, editorViewOptionsCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { gfm } from '@milkdown/preset-gfm'
import { listener, listenerCtx } from '@milkdown/plugin-listener'
import { clipboard } from '@milkdown/plugin-clipboard'
import { history } from '@milkdown/plugin-history'
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react'
import { $prose } from '@milkdown/utils'
import { Plugin, type EditorState } from '@milkdown/prose/state'
import { Decoration, DecorationSet } from '@milkdown/prose/view'
import { taskListItemView } from './markdownTaskListView'
import { safeExternalHref, wantsLinkOpen } from '../lib/links'

/**
 * A placeholder shown while the description is a single empty paragraph. Implemented as a
 * ProseMirror decoration (recomputed on every state) rather than a derived node attribute: node
 * attributes go stale because ProseMirror reuses the `<p>` element across content changes, so the
 * `is-empty` marker survived a paste and the placeholder stayed visible behind the pasted text.
 */
const placeholderPlugin = (text: string) =>
  $prose(
    () =>
      new Plugin({
        props: {
          decorations: (state: EditorState): DecorationSet | null => {
            const { doc } = state
            const first = doc.firstChild
            const isSoleEmptyParagraph =
              doc.childCount === 1 &&
              first != null &&
              first.type.name === 'paragraph' &&
              first.content.size === 0
            if (!isSoleEmptyParagraph) return null
            return DecorationSet.create(doc, [
              Decoration.node(0, first.nodeSize, { class: 'is-empty', 'data-placeholder': text }),
            ])
          },
        },
      }),
  )

interface MarkdownEditorProps {
  value: string // the initial markdown; the editor is uncontrolled after mount (see BIZ-024)
  onChange: (markdown: string) => void
  placeholder?: string
  readOnly?: boolean
}

/**
 * WYSIWYG-in-preview markdown editor for the Task description (BIZ-024). Stores/serialises
 * markdown (via Milkdown's remark-based core) and supports faithful markdown copy/paste. Standard
 * richness comes from `commonmark` + `gfm` (headings, bold/italic/strike, lists, links, quotes,
 * inline/block code, task-list checkboxes).
 *
 * The editor is initialised once from `value` and never re-synced from props afterwards — callers
 * (the Task side panel) mount a fresh instance per Task, so this is sufficient and keeps typing
 * uninterrupted (no controlled-input re-render fights with ProseMirror).
 */
function MilkdownEditorInner({ value, onChange, placeholder, readOnly }: MarkdownEditorProps) {
  useEditor((root) => {
    const editor = Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root)
        ctx.set(defaultValueCtx, value)
        ctx.update(editorViewOptionsCtx, (prev) => ({
          ...prev,
          editable: () => !readOnly,
        }))
        ctx.get(listenerCtx).markdownUpdated((_ctx, markdown, prevMarkdown) => {
          if (markdown !== prevMarkdown) {
            onChange(markdown)
          }
        })
      })
      .use(commonmark)
      .use(gfm)
      .use(taskListItemView)
      .use(listener)
      .use(clipboard)
      .use(history)
    if (placeholder) editor.use(placeholderPlugin(placeholder))
    return editor
  }, [])

  return <Milkdown />
}

export function MarkdownEditor(props: MarkdownEditorProps) {
  // Milkdown is a WYSIWYG editor, so a plain click on a link places the caret (to edit it) rather
  // than navigating. Cmd/Ctrl+click opens it instead — the standard editor convention (BIZ-055).
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!wantsLinkOpen(event)) return
    const anchor = (event.target as HTMLElement).closest?.('a')
    if (!anchor) return
    const href = safeExternalHref(anchor.getAttribute('href') ?? '')
    if (!href) return
    event.preventDefault()
    window.open(href, '_blank', 'noopener,noreferrer')
  }

  // Surface the destination on hover (Milkdown doesn't set one) so a link's URL is discoverable.
  const handleMouseOver = (event: React.MouseEvent<HTMLDivElement>) => {
    const anchor = (event.target as HTMLElement).closest?.('a')
    if (!anchor || anchor.title) return
    const href = anchor.getAttribute('href')
    if (href) anchor.title = href
  }

  return (
    <div
      className="wk-markdown-editor"
      data-testid="wk-markdown-editor"
      onClick={handleClick}
      onMouseOver={handleMouseOver}
    >
      <MilkdownProvider>
        <MilkdownEditorInner {...props} />
      </MilkdownProvider>
    </div>
  )
}
