import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LanguageProvider } from './context/LanguageContext.tsx'
import { LocationProvider } from './context/LocationContext.tsx'
import { NavigationProvider } from './context/NavigationContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <LocationProvider>
        <NavigationProvider>
          <App />
        </NavigationProvider>
      </LocationProvider>
    </LanguageProvider>
  </StrictMode>,
)
