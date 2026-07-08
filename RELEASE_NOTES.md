# Walker v1.2.0

**Tasks organize by project, code selection gets fluid everywhere, and the docs are now bilingual.**

## Added

- **Group tasks by project (code).** The Tasks list gains a "Project (code)" option in its "Group
  by" control (ordered by code name, "No project" last), and the kanban board splits into one
  swimlane per project (plus a "No project" lane) when grouped by project — each lane keeps the full
  status columns. Dragging a card stays status-only within a lane; a task's project is changed in the
  task panel.
- **Searchable, creatable code picker on the Task editor.** A task's code field now opens the same
  rich picker used when categorizing an entry — search your codes, add one from the reference catalog
  on the fly, or create a new real or virtual code — instead of a plain dropdown. It runs in a
  code-only mode (a task has no activity): one click picks the code. "No code (orphan task)" stays
  available.
- **French documentation.** The published docs site is now bilingual — English primary, French a
  fully-translated secondary — with a language switcher in the header.
- **Catalog-import documentation.** A new "Importing your code catalog" page (EN/FR) explains the
  CSV format and how to import your codes, linked from the day-to-day guide.

## Upgrading

No breaking changes, no manual migration steps — upgrade in place.
