import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './styles.css'
import { App } from './App'

const root = document.getElementById('root')!
const tree = (
  <StrictMode>
    <App />
  </StrictMode>
)

/* Після пререндеру в корені вже лежить розмітка, тож підхоплюємо її,
   а не перемальовуємо з нуля. */
if (root.firstChild) hydrateRoot(root, tree)
else createRoot(root).render(tree)
