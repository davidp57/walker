import { Editor, rootCtx, defaultValueCtx, editorViewOptionsCtx } from '@milkdown/core'
import { commonmark, paragraphAttr } from '@milkdown/preset-commonmark'
import { gfm } from '@milkdown/preset-gfm'
import { listener, listenerCtx } from '@milkdown/plugin-listener'
import { clipboard } from '@milkdown/plugin-clipboard'
import { history } from '@milkdown/plugin-history'
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react'
import { taskListItemView } from './markdownTaskListView'
import { safeExternalHref, wantsLinkOpen } from '../lib/links'

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
  useEditor(
    (root) =>
      Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, root)
          ctx.set(defaultValueCtx, value)
          ctx.update(editorViewOptionsCtx, (prev) => ({
            ...prev,
            editable: () => !readOnly,
          }))
          if (placeholder) {
            // Mark the (single) empty leading paragraph so CSS can render a placeholder — Milkdown's
            // Kit API has no built-in placeholder plugin; Crepe's is Vue-only, so this stays plain.
            ctx.set(paragraphAttr.key, (node) => {
              const isSoleEmptyParagraph = node.content.size === 0 && node.nodeSize === 2
              return isSoleEmptyParagraph
                ? { 'data-placeholder': placeholder, class: 'is-empty' }
                : {}
            })
          }
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
        .use(history),
    [],
  )

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
