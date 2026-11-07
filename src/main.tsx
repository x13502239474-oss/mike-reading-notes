import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/tokens.css'
import './styles/app.css'

const root = document.getElementById('root')
if (!root) throw new Error('找不到 #root 挂载节点')

createRoot(root).render(<App />)

// 仅在生产构建注册 Service Worker，避免开发时缓存旧代码
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {
      /* PWA 注册失败不影响网站本身使用 */
    })
  })
}
