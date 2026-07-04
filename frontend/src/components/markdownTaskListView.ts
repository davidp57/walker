import { $view } from '@milkdown/utils'
import { extendListItemSchemaForTask } from '@milkdown/preset-gfm'
import type { Node as ProseMirrorNode } from '@milkdown/prose/model'
import type { NodeView } from '@milkdown/prose/view'

/**
 * A plain ProseMirror NodeView (no framework) that renders GFM task-list items with a real,
 * clickable `<input type="checkbox">` instead of `preset-gfm`'s default static `data-checked`
 * marker. Needed for the faithful WYSIWYG checkbox interaction required by BIZ-024 — the upstream
 * `@milkdown/components` list-item-block would give us this, but it renders via an embedded Vue
 * app, which we don't want inside a React tree. This keeps the markdown schema/serialisation
 * untouched (still `preset-gfm`'s `- [ ]` / `- [x]`) and only changes how it's presented.
 */
class TaskListItemView implements NodeView {
  dom: HTMLLIElement
  contentDOM: HTMLElement
  private checkbox: HTMLInputElement | null = null

  constructor(
    private node: ProseMirrorNode,
    private view: import('@milkdown/prose/view').EditorView,
    private getPos: () => number | undefined,
  ) {
    this.dom = document.createElement('li')
    this.contentDOM = document.createElement('div')
    this.contentDOM.className = 'wk-task-item-content'
    this.dom.appendChild(this.contentDOM)
    this.render(node)
  }

  private render(node: ProseMirrorNode) {
    const checked = node.attrs.checked as boolean | null
    this.dom.dataset.itemType = checked == null ? 'list' : 'task'
    if (checked == null) {
      this.checkbox?.remove()
      this.checkbox = null
      return
    }
    this.dom.dataset.checked = String(checked)
    if (!this.checkbox) {
      this.checkbox = document.createElement('input')
      this.checkbox.type = 'checkbox'
      this.checkbox.className = 'wk-task-item-checkbox'
      this.checkbox.contentEditable = 'false'
      this.checkbox.addEventListener('mousedown', (e) => e.preventDefault())
      this.checkbox.addEventListener('change', () => this.toggle())
      this.dom.insertBefore(this.checkbox, this.contentDOM)
    }
    this.checkbox.checked = checked
  }

  private toggle() {
    const pos = this.getPos()
    if (pos == null) return
    const checked = this.node.attrs.checked as boolean | null
    if (checked == null) return
    const tr = this.view.state.tr.setNodeAttribute(pos, 'checked', !checked)
    this.view.dispatch(tr)
  }

  update(node: ProseMirrorNode): boolean {
    if (node.type !== this.node.type) return false
    this.node = node
    this.render(node)
    return true
  }

  ignoreMutation(): boolean {
    return false
  }
}

export const taskListItemView = $view(
  extendListItemSchemaForTask.node,
  () => (node, view, getPos) => new TaskListItemView(node, view, getPos),
)
