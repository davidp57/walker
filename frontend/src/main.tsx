import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { readCachedResolvedTheme } from './lib/theme'

// Paint the last known-good theme immediately, before React mounts or the settings fetch resolves
// (BIZ-032: "no flash of the wrong theme on load") — App.tsx's effect corrects this once the real
// preference loads, which is a no-op whenever the cache already matches (the common case).
const cachedTheme = readCachedResolvedTheme()
if (cachedTheme) document.documentElement.dataset.theme = cachedTheme

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
