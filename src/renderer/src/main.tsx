import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/source-sans-3/wght.css'
import '@fontsource/source-code-pro/400.css'
import '@fontsource/source-code-pro/500.css'
import App from './App'
import { PathPickerProvider } from './pathPicker/PathPickerContext'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PathPickerProvider>
      <App />
    </PathPickerProvider>
  </StrictMode>
)
