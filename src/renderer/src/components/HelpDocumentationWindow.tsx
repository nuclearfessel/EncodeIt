import { useCallback, useState, type ReactNode } from 'react'
import {
  USER_GUIDE_SECTIONS,
  USER_GUIDE_TITLE,
  type DocBlock,
  type DocSection
} from '../docs/userGuide'
import { Splitter } from './Splitter'
import { WindowControls } from './WindowControls'

const NAV_WIDTH_DEFAULT = 200
const NAV_WIDTH_MIN = 120
const NAV_WIDTH_MAX = 420

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g)
  return parts.filter(Boolean).map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="help-docs-code">
          {part.slice(1, -1)}
        </code>
      )
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}

function DocBlocks({ blocks }: { blocks: DocBlock[] }) {
  return (
    <>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'p':
            return (
              <p key={i} className="help-docs-p">
                {renderInline(block.text)}
              </p>
            )
          case 'note':
            return (
              <aside key={i} className="help-docs-note">
                <span className="help-docs-note-label">Note</span>
                {renderInline(block.text)}
              </aside>
            )
          case 'ol':
            return (
              <ol key={i} className="help-docs-list help-docs-ol">
                {block.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </ol>
            )
          case 'ul':
            return (
              <ul key={i} className="help-docs-list help-docs-ul">
                {block.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </ul>
            )
          case 'table':
            return (
              <div key={i} className="help-docs-table-wrap">
                <table className="help-docs-table">
                  <thead>
                    <tr>
                      {block.headers.map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td key={ci}>{renderInline(cell)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          case 'kbd':
            return (
              <div key={i} className="help-docs-table-wrap">
                <table className="help-docs-table help-docs-kbd-table">
                  <thead>
                    <tr>
                      <th>Shortcut</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row) => (
                      <tr key={row.keys}>
                        <td>
                          <kbd className="help-docs-kbd">{row.keys}</kbd>
                        </td>
                        <td>{row.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          case 'sub':
            return (
              <section key={i} className="help-docs-sub">
                <h4 className="help-docs-sub-title">{block.title}</h4>
                <div className="help-docs-sub-body">
                  <DocBlocks blocks={block.blocks} />
                </div>
              </section>
            )
          default:
            return null
        }
      })}
    </>
  )
}

function SectionArticle({ section }: { section: DocSection }) {
  return (
    <article className="help-docs-article">
      <header className="help-docs-article-header">
        <h3>{section.title}</h3>
      </header>
      <div className="help-docs-article-body">
        <DocBlocks blocks={section.blocks} />
      </div>
    </article>
  )
}

/** Full-window documentation UI for the floating BrowserWindow. */
export function HelpDocumentationWindow() {
  const [sectionId, setSectionId] = useState(USER_GUIDE_SECTIONS[0]?.id ?? 'overview')
  const [navWidth, setNavWidth] = useState(NAV_WIDTH_DEFAULT)
  const section =
    USER_GUIDE_SECTIONS.find((s) => s.id === sectionId) ?? USER_GUIDE_SECTIONS[0]

  const onNavResize = useCallback((delta: number) => {
    setNavWidth((w) => Math.min(NAV_WIDTH_MAX, Math.max(NAV_WIDTH_MIN, w + delta)))
  }, [])

  return (
    <div className="app floating-app help-docs-app" role="document" aria-labelledby="help-docs-title">
      <div className="float-titlebar">
        <span className="float-titlebar-label" id="help-docs-title">
          {USER_GUIDE_TITLE}
        </span>
        <WindowControls />
      </div>

      <div className="help-docs-shell">
        <nav
          className="prefs-nav help-docs-nav"
          aria-label="Documentation sections"
          style={{ width: navWidth }}
        >
          {USER_GUIDE_SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={section?.id === s.id ? 'active' : ''}
              onClick={() => setSectionId(s.id)}
            >
              {s.title}
            </button>
          ))}
        </nav>

        <Splitter
          orientation="vertical"
          label="Resize documentation navigation"
          onDrag={onNavResize}
          onReset={() => setNavWidth(NAV_WIDTH_DEFAULT)}
        />

        <div className="help-docs-panel">{section ? <SectionArticle section={section} /> : null}</div>
      </div>
    </div>
  )
}
