import type { PanelId } from './panels'

const ALL_PANELS: PanelId[] = ['media', 'presets', 'queue', 'encoding']

/** Outer workspace edges and relative sides of a target panel. */
export type DockEdge = 'left' | 'right' | 'top' | 'bottom'

export type LayoutNode =
  | { type: 'panel'; id: PanelId }
  | { type: 'split'; dir: 'row' | 'col'; children: LayoutChild[] }

export interface LayoutChild {
  /** Flex weight (relative). */
  size: number
  node: LayoutNode
}

export type PanelPlacement = 'docked' | 'undocked' | 'closed'

export interface WorkspaceState {
  root: LayoutNode | null
  /** Placement for every panel id. */
  placement: Record<PanelId, PanelPlacement>
}

export interface DropTarget {
  /** Dock against the whole workspace edge. */
  kind: 'edge'
  edge: DockEdge
}

export interface DropTargetBeside {
  kind: 'beside'
  /** Existing docked panel to split against. */
  beside: PanelId
  edge: DockEdge
}

export type AnyDropTarget = DropTarget | DropTargetBeside

export function defaultWorkspace(): WorkspaceState {
  return {
    root: {
      type: 'split',
      dir: 'row',
      children: [
        {
          size: 35,
          node: {
            type: 'split',
            dir: 'col',
            children: [
              { size: 52, node: { type: 'panel', id: 'media' } },
              { size: 48, node: { type: 'panel', id: 'presets' } }
            ]
          }
        },
        {
          size: 65,
          node: {
            type: 'split',
            dir: 'col',
            children: [
              { size: 38, node: { type: 'panel', id: 'encoding' } },
              { size: 62, node: { type: 'panel', id: 'queue' } }
            ]
          }
        }
      ]
    },
    placement: {
      media: 'docked',
      presets: 'docked',
      queue: 'docked',
      encoding: 'docked'
    }
  }
}

export function cloneLayout(node: LayoutNode | null): LayoutNode | null {
  if (!node) return null
  if (node.type === 'panel') return { type: 'panel', id: node.id }
  return {
    type: 'split',
    dir: node.dir,
    children: node.children.map((c) => ({
      size: c.size,
      node: cloneLayout(c.node)!
    }))
  }
}

export function collectDocked(node: LayoutNode | null): PanelId[] {
  if (!node) return []
  if (node.type === 'panel') return [node.id]
  return node.children.flatMap((c) => collectDocked(c.node))
}

/** Remove a panel from the tree; collapse single-child splits. */
export function removePanel(node: LayoutNode | null, id: PanelId): LayoutNode | null {
  if (!node) return null
  if (node.type === 'panel') return node.id === id ? null : { type: 'panel', id: node.id }

  const children: LayoutChild[] = []
  for (const child of node.children) {
    const next = removePanel(child.node, id)
    if (next) children.push({ size: child.size, node: next })
  }
  if (children.length === 0) return null
  if (children.length === 1) return children[0].node
  return { type: 'split', dir: node.dir, children: normalizeSizes(children) }
}

function normalizeSizes(children: LayoutChild[]): LayoutChild[] {
  const total = children.reduce((s, c) => s + c.size, 0) || children.length
  return children.map((c) => ({ ...c, size: (c.size / total) * 100 }))
}

const MIN_PANE_PX = 120

/** Resize the pair of children around a splitter (`leftIndex` / `leftIndex + 1`). */
export function resizeSplitChildren(
  children: LayoutChild[],
  leftIndex: number,
  deltaPx: number,
  containerPx: number,
  minPx = MIN_PANE_PX
): LayoutChild[] {
  if (
    containerPx <= 0 ||
    leftIndex < 0 ||
    leftIndex + 1 >= children.length ||
    deltaPx === 0
  ) {
    return children
  }

  const totalWeight = children.reduce((s, c) => s + c.size, 0) || children.length
  const px = children.map((c) => (c.size / totalWeight) * containerPx)
  const pair = px[leftIndex] + px[leftIndex + 1]
  if (pair < minPx * 2) return children

  let left = px[leftIndex] + deltaPx
  left = Math.max(minPx, Math.min(pair - minPx, left))
  const right = pair - left

  const nextPx = [...px]
  nextPx[leftIndex] = left
  nextPx[leftIndex + 1] = right
  const sum = nextPx.reduce((a, b) => a + b, 0) || 1

  return children.map((c, i) => ({
    ...c,
    size: (nextPx[i] / sum) * 100
  }))
}

/**
 * Apply a splitter drag at `path` into the layout tree.
 * `path` indexes split children from the root; empty path = resize at root split.
 */
export function resizeAtPath(
  root: LayoutNode,
  path: number[],
  leftIndex: number,
  deltaPx: number,
  containerPx: number
): LayoutNode {
  if (root.type === 'panel') return root

  if (path.length === 0) {
    return {
      type: 'split',
      dir: root.dir,
      children: resizeSplitChildren(root.children, leftIndex, deltaPx, containerPx)
    }
  }

  const [head, ...rest] = path
  return {
    type: 'split',
    dir: root.dir,
    children: root.children.map((child, i) => {
      if (i !== head) return child
      return {
        ...child,
        node: resizeAtPath(child.node, rest, leftIndex, deltaPx, containerPx)
      }
    })
  }
}

/** Reset sibling pair at a path to equal weights. */
export function resetSplitPair(
  root: LayoutNode,
  path: number[],
  leftIndex: number
): LayoutNode {
  if (root.type === 'panel') return root

  if (path.length === 0) {
    if (leftIndex + 1 >= root.children.length) return root
    const children = root.children.map((c, i) => {
      if (i === leftIndex || i === leftIndex + 1) return { ...c, size: 50 }
      return c
    })
    return { type: 'split', dir: root.dir, children: normalizeSizes(children) }
  }

  const [head, ...rest] = path
  return {
    type: 'split',
    dir: root.dir,
    children: root.children.map((child, i) =>
      i === head ? { ...child, node: resetSplitPair(child.node, rest, leftIndex) } : child
    )
  }
}

function insertEdge(root: LayoutNode | null, id: PanelId, edge: DockEdge): LayoutNode {
  const leaf: LayoutNode = { type: 'panel', id }
  if (!root) return leaf

  const stripWeight = 28
  const restWeight = 72

  if (edge === 'left' || edge === 'right') {
    const kids: LayoutChild[] =
      edge === 'left'
        ? [
            { size: stripWeight, node: leaf },
            { size: restWeight, node: root }
          ]
        : [
            { size: restWeight, node: root },
            { size: stripWeight, node: leaf }
          ]
    if (root.type === 'split' && root.dir === 'row') {
      return {
        type: 'split',
        dir: 'row',
        children: normalizeSizes(
          edge === 'left'
            ? [{ size: stripWeight, node: leaf }, ...root.children]
            : [...root.children, { size: stripWeight, node: leaf }]
        )
      }
    }
    return { type: 'split', dir: 'row', children: kids }
  }

  const kids: LayoutChild[] =
    edge === 'top'
      ? [
          { size: stripWeight, node: leaf },
          { size: restWeight, node: root }
        ]
      : [
          { size: restWeight, node: root },
          { size: stripWeight, node: leaf }
        ]
  if (root.type === 'split' && root.dir === 'col') {
    return {
      type: 'split',
      dir: 'col',
      children: normalizeSizes(
        edge === 'top'
          ? [{ size: stripWeight, node: leaf }, ...root.children]
          : [...root.children, { size: stripWeight, node: leaf }]
      )
    }
  }
  return { type: 'split', dir: 'col', children: kids }
}

/** Split beside an existing panel (AME drop on a panel edge). */
export function dockBeside(
  root: LayoutNode | null,
  id: PanelId,
  beside: PanelId,
  edge: DockEdge
): LayoutNode {
  if (!root) return { type: 'panel', id }
  return dockBesideNode(root, id, beside, edge) ?? insertEdge(root, id, edge)
}

function dockBesideNode(
  node: LayoutNode,
  id: PanelId,
  beside: PanelId,
  edge: DockEdge
): LayoutNode | null {
  if (node.type === 'panel') {
    if (node.id !== beside) return null
    const a: LayoutNode = { type: 'panel', id: beside }
    const b: LayoutNode = { type: 'panel', id }
    const dir: 'row' | 'col' = edge === 'left' || edge === 'right' ? 'row' : 'col'
    const children: LayoutChild[] =
      edge === 'left' || edge === 'top'
        ? [
            { size: 50, node: b },
            { size: 50, node: a }
          ]
        : [
            { size: 50, node: a },
            { size: 50, node: b }
          ]
    return { type: 'split', dir, children }
  }

  let changed = false
  const children = node.children.map((c) => {
    const next = dockBesideNode(c.node, id, beside, edge)
    if (next) {
      changed = true
      return { ...c, node: next }
    }
    return c
  })
  return changed ? { type: 'split', dir: node.dir, children } : null
}

export function dockToEdge(
  root: LayoutNode | null,
  id: PanelId,
  edge: DockEdge
): LayoutNode {
  const cleaned = removePanel(root, id)
  return insertEdge(cleaned, id, edge)
}

export function applyDrop(
  state: WorkspaceState,
  id: PanelId,
  target: AnyDropTarget
): WorkspaceState {
  let root = removePanel(state.root, id)
  if (target.kind === 'edge') {
    root = dockToEdge(root, id, target.edge)
  } else {
    root = dockBeside(root, id, target.beside, target.edge)
  }
  const docked = new Set(collectDocked(root))
  const placement = { ...state.placement }
  for (const pid of ALL_PANELS) {
    if (docked.has(pid)) placement[pid] = 'docked'
    else if (placement[pid] === 'docked') placement[pid] = 'closed'
  }
  placement[id] = 'docked'
  return { root, placement }
}

export function markUndocked(state: WorkspaceState, id: PanelId): WorkspaceState {
  return {
    root: removePanel(state.root, id),
    placement: { ...state.placement, [id]: 'undocked' }
  }
}

export function markClosed(state: WorkspaceState, id: PanelId): WorkspaceState {
  return {
    root: removePanel(state.root, id),
    placement: { ...state.placement, [id]: 'closed' }
  }
}

export function ensureDefaultIfEmpty(state: WorkspaceState): WorkspaceState {
  if (state.root) return state
  const dockedIds = ALL_PANELS.filter((id) => state.placement[id] === 'docked')
  if (!dockedIds.length) return state
  let root: LayoutNode | null = null
  for (const id of dockedIds) {
    root = dockToEdge(root, id, 'right')
  }
  return { ...state, root }
}

/** Hit-test outer edge zones (ratios relative to workspace rect). */
export function hitTestOuterEdge(
  x: number,
  y: number,
  width: number,
  height: number,
  band = 48
): DropTarget | null {
  if (width <= 0 || height <= 0) return null
  const distLeft = x
  const distRight = width - x
  const distTop = y
  const distBottom = height - y
  const min = Math.min(distLeft, distRight, distTop, distBottom)
  if (min > band) return null
  if (min === distLeft) return { kind: 'edge', edge: 'left' }
  if (min === distRight) return { kind: 'edge', edge: 'right' }
  if (min === distTop) return { kind: 'edge', edge: 'top' }
  return { kind: 'edge', edge: 'bottom' }
}

/** Hit-test edges of a panel rect (for beside docking). */
export function hitTestPanelEdge(
  x: number,
  y: number,
  rect: { left: number; top: number; width: number; height: number },
  beside: PanelId,
  band = 36
): DropTargetBeside | null {
  const lx = x - rect.left
  const ly = y - rect.top
  if (lx < 0 || ly < 0 || lx > rect.width || ly > rect.height) return null
  const distLeft = lx
  const distRight = rect.width - lx
  const distTop = ly
  const distBottom = rect.height - ly
  const min = Math.min(distLeft, distRight, distTop, distBottom)
  if (min > band) return null
  if (min === distLeft) return { kind: 'beside', beside, edge: 'left' }
  if (min === distRight) return { kind: 'beside', beside, edge: 'right' }
  if (min === distTop) return { kind: 'beside', beside, edge: 'top' }
  return { kind: 'beside', beside, edge: 'bottom' }
}
