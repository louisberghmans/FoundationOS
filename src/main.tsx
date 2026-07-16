import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BaseStyles, ThemeProvider } from '@primer/react'
import '@primer/primitives/dist/css/functional/themes/light.css'
import App from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider colorMode="day">
      <BaseStyles>
        <App />
      </BaseStyles>
    </ThemeProvider>
  </StrictMode>,
)
