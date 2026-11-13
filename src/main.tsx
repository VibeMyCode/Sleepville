import { createRoot } from 'react-dom/client'
import '@fontsource-variable/onest'
import '@fontsource/cormorant-garamond/latin-600-italic.css'
import '@fontsource/cormorant-garamond/latin-ext-600-italic.css'
import '@fontsource/cormorant-garamond/cyrillic-600-italic.css'
import './styles.css'
import App from './App'

// First paint waits for the bundled fonts (a few ms from disk); otherwise every label
// is drawn in a fallback face and then jumps when the real one arrives.
const fonts = ["italic 600 1em 'Cormorant Garamond'", "1em 'Onest Variable'"].map((f) => document.fonts.load(f, 'Sя'))
Promise.all(fonts).finally(() => createRoot(document.getElementById('root')!).render(<App />))
