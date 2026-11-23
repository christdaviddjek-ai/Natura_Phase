import './index.css'
import './App.css'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import HomePage from './pages/HomePage'
import AnimalPage from './pages/AnimalPage'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function TopBar({ theme, onToggle }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <header className={`topbar ${scrolled ? 'scrolled' : ''}`}>
      <Link to="/" className="topbar-logo" aria-label="Accueil Natura">NATURA</Link>
      <div className="topbar-right">
        <span className="topbar-beta">Bêta V1.0</span>
        <button type="button" className="icon-btn" onClick={onToggle} aria-label="Basculer le thème clair / sombre">
          {theme === 'dark' ? <Sun size={18} strokeWidth={1.8} /> : <Moon size={18} strokeWidth={1.8} />}
        </button>
      </div>
    </header>
  )
}

export default function App() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('theme', theme) } catch { /* ignore */ }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#060a08' : '#f3f8f4')
  }, [theme])

  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="app-shell">
        <TopBar theme={theme} onToggle={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} />
        <main className="app-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/animal/:id" element={<AnimalPage />} />
            <Route path="*" element={<HomePage />} />
          </Routes>
        </main>
        <footer className="site-footer">
          <strong>La faune compte.</strong>{' '}
          <span>La diversité des espèces est essentielle à l'équilibre de notre planète — protégeons-la ensemble. By Honodev</span>
        </footer>
      </div>
    </BrowserRouter>
  )
}
