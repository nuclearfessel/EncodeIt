import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react'
import { basename, dirname } from '../../../shared/pathUtil'
import { PathPickerDialog, type PathPickerMode } from '../components/PathPickerDialog'

interface PathPickerRequest {
  mode: PathPickerMode
  title: string
  startPath?: string
  defaultFileName?: string
  resolve: (value: string[] | string | null) => void
}

interface PathPickerApi {
  openFiles: (startPath?: string) => Promise<string[]>
  openDirectory: (startPath?: string) => Promise<string | null>
  saveFile: (defaultPath: string) => Promise<string | null>
}

const PathPickerContext = createContext<PathPickerApi | null>(null)

export function PathPickerProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<PathPickerRequest | null>(null)
  const requestRef = useRef<PathPickerRequest | null>(null)

  const close = useCallback((value: string[] | string | null) => {
    const current = requestRef.current
    requestRef.current = null
    setRequest(null)
    current?.resolve(value)
  }, [])

  const ask = useCallback(
    ( partial: Omit<PathPickerRequest, 'resolve'>) =>
      new Promise<string[] | string | null>((resolve) => {
        if (requestRef.current) {
          requestRef.current.resolve(partial.mode === 'openFiles' ? [] : null)
        }
        const next: PathPickerRequest = { ...partial, resolve }
        requestRef.current = next
        setRequest(next)
      }),
    []
  )

  const api = useMemo<PathPickerApi>(
    () => ({
      openFiles: async (startPath?: string) => {
        const result = await ask({
          mode: 'openFiles',
          title: 'Add Source',
          startPath
        })
        return Array.isArray(result) ? result : []
      },
      openDirectory: async (startPath?: string) => {
        const result = await ask({
          mode: 'openDirectory',
          title: 'Choose Folder',
          startPath
        })
        return typeof result === 'string' ? result : null
      },
      saveFile: async (defaultPath: string) => {
        const defaultFileName = basename(defaultPath) || 'output.mp4'
        const startPath = dirname(defaultPath)
        const result = await ask({
          mode: 'saveFile',
          title: 'Set Output File',
          startPath: startPath !== defaultPath ? startPath : undefined,
          defaultFileName
        })
        return typeof result === 'string' ? result : null
      }
    }),
    [ask]
  )

  return (
    <PathPickerContext.Provider value={api}>
      {children}
      {request ? (
        <PathPickerDialog
          mode={request.mode}
          title={request.title}
          startPath={request.startPath}
          defaultFileName={request.defaultFileName}
          onCancel={() => close(request.mode === 'openFiles' ? [] : null)}
          onConfirm={(value) => close(value)}
        />
      ) : null}
    </PathPickerContext.Provider>
  )
}

export function usePathPicker(): PathPickerApi {
  const ctx = useContext(PathPickerContext)
  if (!ctx) {
    throw new Error('usePathPicker must be used within PathPickerProvider')
  }
  return ctx
}
