import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle, ArrowDownAZ, ArrowRight, BarChart3, BookOpen, ChevronLeft, ChevronRight, MessageCircle,
  Pause, Play, RefreshCw, Rocket, Search, Sparkles, Telescope, Volume2, VolumeX,
} from 'lucide-react'
import AnimalCard from '../components/AnimalCard'
import ElonHead3D from '../components/ElonHead3D'
import ElonAssistant from '../components/ElonAssistant'
import { getAnimalsByCategory, searchAnimals, CATEGORIES } from '../services/animalService'
import { saveUserName, loadUserName, saveLastCategory, loadLastCategory } from '../services/storageService'
import { speak, stopSpeaking, useTypewriter } from '../hooks/useElon'
import './HomePage.css'

/* La visite guidée : Elon présente la plateforme de A à Z */
const TOUR = [
  { letter: 'A', icon: Sparkles, title: 'Faire connaissance', pose: { yaw: 0, pitch: 0 },
    text: "Bonjour, je suis Elon, le guide IA de Natura. Je vais te présenter la plateforme de A à Z, en moins d'une minute." },
  { letter: 'B', icon: Telescope, title: 'Explorer', pose: { yaw: -0.4, pitch: -0.05 },
    text: "D'abord, tu choisis une catégorie : mammifères, oiseaux, reptiles, poissons, amphibiens ou insectes. Chacune réunit les 40 espèces les plus observées au monde." },
  { letter: 'C', icon: ArrowDownAZ, title: 'Trier et chercher', pose: { yaw: 0.4, pitch: 0.05 },
    text: "Tu peux trier par popularité, par ordre alphabétique ou par espèces rares, et chercher n'importe quel animal par son nom." },
  { letter: 'D', icon: BookOpen, title: 'Ouvrir une fiche', pose: { yaw: 0, pitch: 0.18 },
    text: "Un clic sur une carte ouvre la fiche détaillée : galerie photo, classification, statut de conservation et ma présentation complète de l'animal." },
  { letter: 'E', icon: MessageCircle, title: 'Me parler', pose: { yaw: -0.2, roll: 0.14 },
    text: "Sur chaque fiche, je te présente l'animal à voix haute. Tu peux me poser tes questions à l'écrit ou au micro, et je te réponds." },
  { letter: 'F', icon: Rocket, title: "À toi de jouer", pose: { yaw: 0, pitch: -0.1 },
    text: "Je reste avec toi pendant toute l'exploration, en bas à droite de l'écran. Dis-moi ton prénom si tu veux, et on commence !" },
]

const SORTS = [
  { key: 'observations', label: 'Populaires', icon: BarChart3 },
  { key: 'name', label: 'A → Z', icon: ArrowDownAZ },
  { key: 'rare', label: 'Plus rares', icon: Telescope },
]

export default function HomePage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const inMain = params.get('view') === 'categories'
  const catParam = params.get('category')
  const category = CATEGORIES[catParam] ? catParam : (CATEGORIES[loadLastCategory()] ? loadLastCategory() : 'mammiferes')

  const [userName, setUserName] = useState(() => loadUserName() || '')
  const [nameInput, setNameInput] = useState(() => loadUserName() || '')

  /* ───── Visite guidée ───── */
  const [tour, setTour] = useState(0)
  const [runId, setRunId] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [voice, setVoice] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const tw = useTypewriter()
  const { run: typeRun } = tw
  const live = useRef({ voice, playing })
  useEffect(() => { live.current = { voice, playing } })

  const next = useCallback(() => {
    setTour((t) => {
      if (t >= TOUR.length - 1) { setPlaying(false); return t }
      return t + 1
    })
  }, [])

  useEffect(() => {
    if (inMain) return undefined
    const step = TOUR[tour]
    typeRun(step.text)
    if (live.current.voice) {
      speak(step.text, {
        onStart: () => setSpeaking(true),
        onEnd: () => { setSpeaking(false); if (live.current.playing) next() },
      })
    }
    return undefined
  }, [tour, runId, inMain, typeRun, next])

  // Sans voix, la visite avance toute seule
  useEffect(() => {
    if (!playing || voice || inMain) return undefined
    const t = setTimeout(next, 7000)
    return () => clearTimeout(t)
  }, [playing, voice, tour, inMain, next])

  useEffect(() => () => stopSpeaking(), [])
  useEffect(() => { if (inMain) { stopSpeaking(); setSpeaking(false); setPlaying(false) } }, [inMain])

  const startTour = () => { setVoice(true); setPlaying(true); setTour(0); setRunId((n) => n + 1) }
  const stopTour = () => { setPlaying(false); stopSpeaking(); setSpeaking(false) }
  const goTo = (i) => { setTour(i); setRunId((n) => n + 1) }
  const toggleVoice = () => { if (voice) { stopSpeaking(); setSpeaking(false) } setVoice((v) => !v); setRunId((n) => n + 1) }

  /* ───── Entrer dans l'exploration ───── */
  const enter = (catKey = category) => {
    const n = nameInput.trim()
    if (n) { saveUserName(n); setUserName(n) }
    saveLastCategory(catKey)
    stopSpeaking()
    setParams({ view: 'categories', category: catKey })
    window.scrollTo(0, 0)
  }
  const chooseCategory = (k) => { saveLastCategory(k); setQuery(''); setParams({ view: 'categories', category: k }, { replace: true }) }

  /* ───── Explorateur ───── */
  const [query, setQuery] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [sortType, setSortType] = useState('observations')
  const [animaux, setAnimaux] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const cache = useRef({})

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query.trim().length >= 2 ? query.trim() : ''), 400)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    if (!inMain) return undefined
    const key = debouncedQ ? `q:${debouncedQ.toLowerCase()}` : `c:${category}`
    if (cache.current[key]) { setAnimaux(cache.current[key]); setError(''); setLoading(false); return undefined }
    let off = false
    setLoading(true)
    setError('')
    const req = debouncedQ ? searchAnimals(debouncedQ) : getAnimalsByCategory(CATEGORIES[category].id)
    req
      .then((d) => { if (off) return; cache.current[key] = d; setAnimaux(d) })
      .catch(() => { if (off) return; setAnimaux([]); setError("Impossible de charger les espèces pour le moment. Vérifie ta connexion.") })
      .finally(() => { if (!off) setLoading(false) })
    return () => { off = true }
  }, [inMain, category, debouncedQ, attempt])

  // Retrouve la position de défilement en revenant d'une fiche
  useEffect(() => {
    if (!inMain || loading || animaux.length === 0) return
    try {
      const y = sessionStorage.getItem('natura_scroll')
      if (y) { sessionStorage.removeItem('natura_scroll'); requestAnimationFrame(() => window.scrollTo(0, Number(y))) }
    } catch { /* ignore */ }
  }, [inMain, loading, animaux.length])

  const sorted = useMemo(() => {
    const list = [...animaux]
    const nm = (a) => (a.preferred_common_name || a.name || '').toLowerCase()
    if (sortType === 'name') list.sort((a, b) => nm(a).localeCompare(nm(b), 'fr'))
    else if (sortType === 'rare') list.sort((a, b) => (a.observations_count || 0) - (b.observations_count || 0))
    else list.sort((a, b) => (b.observations_count || 0) - (a.observations_count || 0))
    return list
  }, [animaux, sortType])

  const openAnimal = (animal) => {
    try { sessionStorage.setItem('natura_scroll', String(window.scrollY)) } catch { /* ignore */ }
    navigate(`/animal/${animal.id}`, { state: { animal, fromCategory: category } })
  }

  const tip = loading ? 'Je prépare les espèces…'
    : error ? "L'API iNaturalist ne répond pas. Clique sur « Réessayer »."
    : debouncedQ ? `${animaux.length} résultat${animaux.length > 1 ? 's' : ''} pour « ${debouncedQ} ».`
    : `Voici les ${CATEGORIES[category].label.toLowerCase()} les plus observés. Clique sur une carte pour ouvrir sa fiche, ou sur la bulle pour me parler.`

  /* ═════════ EXPLORATEUR ═════════ */
  if (inMain) {
    return (
      <div className="hp-main">
        <div className="hp-main-head">
          <div>
            <h1 className="hp-greeting">Bonjour, <span>{userName || 'Explorateur'}</span></h1>
            <p className="hp-muted">Quelle espèce souhaites-tu explorer aujourd'hui ?</p>
          </div>
          <label className="hp-search">
            <Search size={16} aria-hidden="true" />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Chercher un animal (lion, aigle…)" aria-label="Chercher un animal" />
          </label>
        </div>

        <div className="hp-chips" role="tablist" aria-label="Catégories">
          {Object.entries(CATEGORIES).map(([k, c]) => (
            <button key={k} type="button" role="tab" aria-selected={!debouncedQ && category === k}
              className={`hp-chip ${!debouncedQ && category === k ? 'active' : ''}`} onClick={() => chooseCategory(k)}>
              <span aria-hidden="true">{c.emoji}</span> {c.label}
            </button>
          ))}
        </div>

        <div className="hp-sortbar">
          <span className="hp-label">{debouncedQ ? `Résultats pour « ${debouncedQ} »` : 'Espèces disponibles'}</span>
          <div className="hp-sorts">
            {SORTS.map((s) => (
              <button key={s.key} type="button" className={`hp-sort ${sortType === s.key ? 'active' : ''}`} onClick={() => setSortType(s.key)}>
                <s.icon size={14} aria-hidden="true" /> {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="hp-grid">
          {loading ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="shimmer hp-skeleton" />)
            : error ? (
              <div className="hp-state hp-error" role="alert">
                <AlertTriangle size={26} aria-hidden="true" />
                <p>{error}</p>
                <button type="button" className="btn btn-ghost" onClick={() => { delete cache.current[debouncedQ ? `q:${debouncedQ.toLowerCase()}` : `c:${category}`]; setAttempt((a) => a + 1) }}>
                  <RefreshCw size={15} aria-hidden="true" /> Réessayer
                </button>
              </div>
            ) : sorted.length === 0 ? <div className="hp-state hp-muted">Aucune espèce trouvée.</div>
            : sorted.map((a) => <AnimalCard key={a.id} animal={a} onClick={openAnimal} category={category} />)}
        </div>

        <ElonAssistant tip={tip} context={`l'utilisateur explore la catégorie « ${CATEGORIES[category].label} » sur Natura`} />
      </div>
    )
  }

  /* ═════════ ACCUEIL : Elon présente tout de A à Z ═════════ */
  const step = TOUR[tour]
  const talking = speaking || tw.typing
  return (
    <div className="hp-home">
      <section className="hp-hero">
        <div className="hp-hero-copy">
          <span className="hp-eyebrow"><i /> Plateforme naturaliste IA</span>
          <h1 className="hp-title">Rencontre <span>Elon</span>,<br />ton guide de la faune mondiale</h1>
          <p className="hp-lead">Explore plus de 200 espèces, écoute leur histoire et pose tes questions à voix haute. Elon te fait visiter Natura de A à Z.</p>

          <div className="hp-bubble" aria-live="polite">
            <div className="hp-bubble-top">
              <span className="hp-bubble-letter">{step.letter}</span>
              <step.icon size={16} aria-hidden="true" />
              <strong>{step.title}</strong>
              <span className="hp-bubble-count">{tour + 1} / {TOUR.length}</span>
            </div>
            <div className="hp-bubble-text">{tw.text}{tw.typing && <span className="cursor" />}</div>
            <div className="hp-bubble-bar">
              <div className="hp-dots">
                {TOUR.map((t, i) => (
                  <button key={t.letter} type="button" className={`hp-dot ${i === tour ? 'active' : ''} ${i < tour ? 'done' : ''}`} onClick={() => goTo(i)} aria-label={`Étape ${t.letter} : ${t.title}`} />
                ))}
              </div>
              <div className="hp-ctrl">
                <button type="button" className="icon-btn" onClick={() => goTo(Math.max(0, tour - 1))} disabled={tour === 0} aria-label="Étape précédente"><ChevronLeft size={18} /></button>
                <button type="button" className="icon-btn" onClick={() => goTo(Math.min(TOUR.length - 1, tour + 1))} disabled={tour === TOUR.length - 1} aria-label="Étape suivante"><ChevronRight size={18} /></button>
                <button type="button" className="icon-btn" onClick={toggleVoice} aria-label={voice ? 'Couper la voix' : 'Activer la voix'}>{voice ? <Volume2 size={17} /> : <VolumeX size={17} />}</button>
                <button type="button" className="btn btn-ghost hp-play" onClick={playing ? stopTour : startTour}>
                  {playing ? <><Pause size={15} /> Pause</> : <><Play size={15} /> Visite guidée</>}
                </button>
              </div>
            </div>
          </div>

          <form className="hp-cta" onSubmit={(e) => { e.preventDefault(); enter() }}>
            <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="Ton prénom (facultatif)" maxLength={24} aria-label="Ton prénom" />
            <button type="submit" className="btn btn-primary">
              {userName ? `Reprendre, ${userName}` : "Commencer l'exploration"} <ArrowRight size={16} aria-hidden="true" />
            </button>
          </form>
        </div>

        <div className="hp-hero-stage" aria-hidden="false">
          <div className="hp-stage-glow" />
          <ElonHead3D speaking={talking} pose={step.pose} />
          <span className="hp-stage-tag">Elon · IA guide {talking && <em>parle…</em>}</span>
        </div>
      </section>

      <section className="hp-section">
        <header className="hp-section-head">
          <span className="hp-label">Le système de A à Z</span>
          <h2>Tout ce qu'Elon fait pour toi</h2>
        </header>
        <div className="hp-steps">
          {TOUR.map((t, i) => (
            <button key={t.letter} type="button" className="hp-step" onClick={() => { goTo(i); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
              <span className="hp-step-letter">{t.letter}</span>
              <t.icon size={22} strokeWidth={1.6} aria-hidden="true" />
              <strong>{t.title}</strong>
              <span>{t.text.split('. ')[0].replace(/\.$/, '')}.</span>
            </button>
          ))}
        </div>
      </section>

      <section className="hp-section">
        <header className="hp-section-head">
          <span className="hp-label">Par où commencer ?</span>
          <h2>Six mondes à explorer</h2>
        </header>
        <div className="hp-cats">
          {Object.entries(CATEGORIES).map(([k, c]) => (
            <button key={k} type="button" className="hp-cat" onClick={() => enter(k)}>
              <span className="hp-cat-emoji" aria-hidden="true">{c.emoji}</span>
              <strong>{c.label}</strong>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
