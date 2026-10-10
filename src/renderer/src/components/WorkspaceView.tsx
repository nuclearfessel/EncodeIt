import { Fragment, useCallback, useRef, type ReactNode } from 'react'
import type { PanelId } from '../../../shared/panels'
import type { LayoutNode } from '../../../shared/workspaceLayout'
import { Splitter } from './Splitter'

interface Props {
  root: LayoutNode
  renderPanel: (id: PanelId) => ReactNode
  onResize: (path: number[], leftIndex: number, deltaPx: number, containerPx: number) => void
  onResetSplit: (path: number[], leftIndex: number) => void
}

/** Recursive AME-style split workspace with live splitter resizing. */
export function WorkspaceView({ root, renderPanel, onResize, onResetSplit }: Props) {
  return (
    <div className="workspace-root">
      <SplitBranch
        node={root}
        path={[]}
        renderPanel={renderPanel}
        onResize={onResize}
        onResetSplit={onResetSplit}
      />
    </div>
  )
}

function SplitBranch({
  node,
  path,
  renderPanel,
  onResize,
  onResetSplit
}: {
  node: LayoutNode
  path: number[]
  renderPanel: (id: PanelId) => ReactNode
  onResize: Props['onResize']
  onResetSplit: Props['onResetSplit']
}) {
  const splitRef = useRef<HTMLDivElement>(null)

  const measure = useCallback(() => {
    const el = splitRef.current
    if (!el) return 0
    return node.type === 'split' && node.dir === 'row' ? el.clientWidth : el.clientHeight
  }, [node])

  if (node.type === 'panel') {
    return (
      <div className="workspace-panel" data-panel-id={node.id}>
        {renderPanel(node.id)}
      </div>
    )
  }

  const horizontal = node.dir === 'row'
  // Subtract splitter gutters so flex weights map to content area.
  const gutterTotal = Math.max(0, node.children.length - 1) * 8

  return (
    <div
      ref={splitRef}
      className={`workspace-split ${horizontal ? 'is-row' : 'is-col'}`}
    >
      {node.children.map((child, index) => (
        <Fragment key={`${path.join('.')}-${index}`}>
          {index > 0 ? (
            <Splitter
              orientation={horizontal ? 'vertical' : 'horizontal'}
              label={horizontal ? 'Resize columns' : 'Resize rows'}
              onDrag={(delta) => {
                const container = Math.max(0, measure() - gutterTotal)
                onResize(path, index - 1, delta, container)
              }}
              onReset={() => onResetSplit(path, index - 1)}
            />
          ) : null}
          <div
            className="workspace-split-child"
            style={{ flex: `${Math.max(child.size, 8)} 1 0` }}
          >
            <SplitBranch
              node={child.node}
              path={[...path, index]}
              renderPanel={renderPanel}
              onResize={onResize}
              onResetSplit={onResetSplit}
            />
          </div>
        </Fragment>
      ))}
    </div>
  )
}
