import { renderToString } from 'react-dom/server'
import { App } from './App'

/** Викликається на етапі збірки: сторінка одна, роутера немає. */
export function render() {
  return renderToString(<App />)
}
