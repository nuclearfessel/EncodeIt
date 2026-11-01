/**
 * App icons from Keyline Icons (https://keylineicons.com/) — stroke, rounded.
 */
export {
  ArrowUp,
  Bin,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleX,
  File,
  FileAudio,
  FileImage,
  FileVideo,
  Folder,
  FolderOpen,
  GripVertical,
  LoaderCircle,
  Menu,
  Moon,
  MoreHorizontal,
  PanelLeftOpen,
  PanelsTopLeft,
  Play,
  Plus,
  RefreshCw,
  Search,
  Square,
  X
} from '@keyline-icons/react'

/** Fill sun — solid disc reads clearer at title-bar size than stroke sun. */
export { Sun as SunFill } from '@keyline-icons/react/fill'

export const iconSize = {
  sm: 14,
  md: 16,
  lg: 18
} as const

export function mediaKindIcon(kind: 'dir' | 'media' | 'other', name: string) {
  if (kind === 'dir') return 'folder' as const
  const lower = name.toLowerCase()
  if (/\.(png|jpe?g|gif|webp|bmp|tiff?|heic)$/i.test(lower)) return 'image' as const
  if (/\.(mp3|wav|aac|flac|m4a|ogg|aiff?)$/i.test(lower)) return 'audio' as const
  if (/\.(mp4|mov|mkv|avi|webm|m4v|wmv|flv|mts|m2ts|mxf|r3d|braw)$/i.test(lower)) {
    return 'video' as const
  }
  return 'file' as const
}
