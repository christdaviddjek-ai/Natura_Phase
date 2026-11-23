import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle, ArrowLeft, Bot, Camera, ChevronLeft, ChevronRight, ExternalLink, Globe, Leaf, Maximize2,
  Mic, MicOff, MessageCircle, RefreshCw, Send, ShieldCheck, Square, Telescope, UserRound, Volume2, X,
} from 'lucide-react'
import ElonHead3D from '../components/ElonHead3D'
import RichText from '../components/RichText'
import { getAnimalDetails, buildGallery, TAXON_FR, IUCN } from '../services/animalService'
import { appelerElon, decrireAnimal } from '../services/iaService'
import { loadLastCategory } from '../services/storageService'
import { speak, stopSpeaking, useSpeechRecognition, useTypewriter } from '../hooks/useElon'
import './AnimalPage.css'

const QUICK = ['Où vit-il ?', 'Que mange-t-il ?', 'Est-il menacé ?', 'Un fait surprenant ?']
const RANKS = { class: 'Classe', order: 'Ordre', family: 'Famille', genus: 'Genre' }

const plainText = (html = '') => new DOMParser().parseFromString(html, 'text/html').body.textContent?.trim() || ''

export default function AnimalPage() {
  const { id } = useParams()
  return <AnimalView key={id} id={id} /> // remet tout l'état à zéro quand l'animal change
}

function AnimalView({ id }) {
  const navigate = useNavigate()
  const location = useLocation()
  const seed = location.state?.animal && String(location.state.animal.id) === String(id) ? location.state.animal : null
  const fromCategory = location.state?.fromCategory || loadLastCategory() || 'mammiferes'
  const cameFromCard = Boolean(seed)

  const [animal, setAnimal] = useState(seed)
  const [status, setStatus] = useState(seed ? 'ready' : 'loading')
  const animalRef = useRef(animal)
  useEffect(() => { animalRef.current = animal }, [animal])

  /* ───── Chargement complet de la fiche (photos, classification, Wikipédia…) ───── */
  const [reload, setReload] = useState(0)
  useEffect(() => {
    let off = false
    getAnimalDetails(id)
      .then((full) => {
        if (off) return
        if (!full?.name) throw new Error('empty')
        setAnimal(full)
        setStatus('ready')
      })
      .catch(() => { if (!off) setStatus((s) => (animalRef.current ? s : 'error')) })
    return () => { off = true }
  }, [id, reload])

  /* ───── Galerie ───── */
  const gallery = useMemo(() => buildGallery(animal), [animal])
  const [slide, setSlide] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const count = gallery.length
  const go = useCallback((d) => setSlide((s) => (count ? (s + d + count) % count : 0)), [count])

  useEffect(() => {
    if (!lightbox) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setLightbox(false)
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'ArrowRight') go(1)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [lightbox, go])

  /* ───── Elon : présentation ───── */
  const [voiceOn, setVoiceOn] = useState(() => { try { return localStorage.getItem('natura_voice') !== 'off' } catch { return true } })
  const [speaking, setSpeaking] = useState(false)
  const [description, setDescription] = useState('')
  const [descLoading, setDescLoading] = useState(true)
  const [apiError, setApiError] = useState('')
  const [descTry, setDescTry] = useState(0)
  const intro = useTypewriter()
  const { run: introRun, cancel: introCancel } = intro
  const animalId = animal?.id

  useEffect(() => {
    const a = animalRef.current
    if (!a) return undefined
    let off = false
    setDescLoading(true)
    setApiError('')
    decrireAnimal(a)
      .then((text) => {
        if (off) return
        setDescLoading(false)
        if (cameFromCard && voiceOn) speak(text, { onStart: () => setSpeaking(true), onEnd: () => setSpeaking(false) })
        introRun(text, () => setDescription(text))
      })
      .catch((err) => {
        if (off) return
        console.error('Erreur Elon:', err)
        setDescLoading(false)
        setApiError("Elon est momentanément indisponible (vérifie GROQ_API_KEY ou ton quota Groq).")
        setDescription('')
      })
    return () => { off = true; introCancel() }
    // voiceOn / cameFromCard ne doivent pas relancer la présentation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animalId, descTry, introRun, introCancel])

  useEffect(() => () => stopSpeaking(), [])

  const toggleVoice = () => {
    setVoiceOn((v) => {
      const nv = !v
      try { localStorage.setItem('natura_voice', nv ? 'on' : 'off') } catch { /* ignore */ }
      if (!nv) { stopSpeaking(); setSpeaking(false) }
      return nv
    })
  }
  const listen = () => {
    if (speaking) { stopSpeaking(); setSpeaking(false); return }
    speak(description, { onStart: () => setSpeaking(true), onEnd: () => setSpeaking(false) })
  }

  /* ───── Elon : discussion ───── */
  const [chat, setChat] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const reply = useTypewriter()
  const { run: replyRun } = reply
  const listRef = useRef(null)
  const inputRef = useRef(null)
  const chatRef = useRef(null)

  useEffect(() => { const l = listRef.current; if (l) l.scrollTop = l.scrollHeight }, [chat, reply.text, chatLoading])

  useEffect(() => {
    if (location.state?.openChat && status === 'ready') {
      chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      inputRef.current?.focus({ preventScroll: true })
    }
  }, [location.state, status])

  const nom = animal?.preferred_common_name || animal?.name || 'cet animal'

  const send = async (text) => {
    const q = text.trim()
    if (!q || chatLoading || reply.typing) return

    if (/(retourn|reviens|revenir|retour)/i.test(q) && /(espace|cat[eè]gori|accueil|liste)/i.test(q)) {
      const msg = "D'accord, je te ramène aux catégories."
      setChat((c) => [...c, { id: crypto.randomUUID(), role: 'user', text: q }, { id: crypto.randomUUID(), role: 'assistant', text: msg }])
      setChatInput('')
      if (voiceOn) speak(msg, { onStart: () => setSpeaking(true), onEnd: () => setSpeaking(false) })
      setTimeout(() => navigate(`/?view=categories&category=${encodeURIComponent(fromCategory)}`), 700)
      return
    }

    const next = [...chat, { id: crypto.randomUUID(), role: 'user', text: q }]
    setChat(next)
    setChatInput('')
    setChatLoading(true)
    const history = [
      { role: 'user', content: `Contexte : on parle de ${nom} (${animal?.name || ''}), groupe : ${animal?.iconic_taxon_name || 'animal'}. Réponds de façon précise et concise.` },
      ...(description ? [{ role: 'assistant', content: description }] : []),
      ...next.map((m) => ({ role: m.role, content: m.text })),
    ]
    try {
      const answer = await appelerElon(history)
      setChatLoading(false)
      if (voiceOn) speak(answer, { onStart: () => setSpeaking(true), onEnd: () => setSpeaking(false) })
      replyRun(answer, () => setChat((c) => [...c, { id: crypto.randomUUID(), role: 'assistant', text: answer }]))
    } catch {
      setChatLoading(false)
      setChat((c) => [...c, { id: crypto.randomUUID(), role: 'assistant', text: "Désolé, je n'ai pas pu répondre. Réessaie !" }])
    }
  }

  const mic = useSpeechRecognition((t) => send(t))

  /* ───── États de chargement ───── */
  if (status === 'loading') {
    return (
      <div className="ap-center">
        <div className="ap-center-head"><ElonHead3D speaking interactive={false} /></div>
        <p className="ap-center-text">Elon prépare la fiche…</p>
      </div>
    )
  }
  if (status === 'error' || !animal) {
    return (
      <div className="ap-center">
        <AlertTriangle size={36} aria-hidden="true" />
        <p className="ap-center-text">Impossible de charger cet animal.</p>
        <div className="ap-center-actions">
          <button type="button" className="btn btn-primary" onClick={() => { setStatus('loading'); setReload((n) => n + 1) }}><RefreshCw size={15} /> Réessayer</button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/?view=categories')}>Retour aux catégories</button>
        </div>
      </div>
    )
  }

  const conservation = animal.conservation_status
  const iucn = IUCN[conservation?.status?.toUpperCase?.()] || (conservation?.status_name ? { label: conservation.status_name, tone: 'muted' } : null)
  const taxonLabel = TAXON_FR[animal.iconic_taxon_name] || animal.iconic_taxon_name || 'Espèce'
  const lineage = (animal.ancestors || []).filter((a) => RANKS[a.rank])
  const wiki = plainText(animal.wikipedia_summary)
  const current = gallery[slide]
  const introText = intro.typing ? intro.text : description

  return (
    <div className="ap-root">
      {/* ───── HERO ───── */}
      <section className="ap-hero">
        <div className="ap-hero-media">
          {count > 0 ? gallery.map((g, i) => {
            const near = Math.min(Math.abs(i - slide), count - Math.abs(i - slide)) <= 1
            return near ? (
              <img key={g.id} className={`ap-hero-img ${i === slide ? 'active' : ''}`} src={g.large} alt={i === slide ? nom : ''}
                loading={i === slide ? 'eager' : 'lazy'} decoding="async" />
            ) : null
          }) : (
            <div className="ap-hero-empty"><Leaf size={72} strokeWidth={1} aria-hidden="true" /></div>
          )}
          <div className="ap-hero-shade" />
        </div>

        <div className="ap-hero-inner">
          <button type="button" className="ap-back" onClick={() => navigate(`/?view=categories&category=${encodeURIComponent(fromCategory)}`, { replace: true })}>
            <ArrowLeft size={16} aria-hidden="true" /> Retour
          </button>

          <div className="ap-hero-title">
            <div className="ap-badges">
              <span className="ap-badge">{taxonLabel}</span>
              {iucn && <span className={`ap-badge tone-${iucn.tone}`}><ShieldCheck size={13} aria-hidden="true" /> {iucn.label}</span>}
            </div>
            <h1>{nom}</h1>
            <p className="ap-sci">{animal.name}</p>
          </div>

          {count > 1 && (
            <div className="ap-gallery-ctrl">
              <button type="button" className="icon-btn" onClick={() => go(-1)} aria-label="Photo précédente"><ChevronLeft size={18} /></button>
              <span>{slide + 1} / {count}</span>
              <button type="button" className="icon-btn" onClick={() => go(1)} aria-label="Photo suivante"><ChevronRight size={18} /></button>
              <button type="button" className="icon-btn" onClick={() => setLightbox(true)} aria-label="Voir en grand"><Maximize2 size={16} /></button>
            </div>
          )}
        </div>
      </section>

      {count > 1 && (
        <div className="ap-thumbs" role="list" aria-label="Galerie photo">
          {gallery.map((g, i) => (
            <button key={g.id} type="button" role="listitem" className={`ap-thumb ${i === slide ? 'active' : ''}`} onClick={() => setSlide(i)} aria-label={`Photo ${i + 1}`}>
              <img src={g.small} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {/* ───── CORPS ───── */}
      <div className="ap-body">
        <div className="ap-col">
          <section className="ap-card ap-elon">
            <div className="ap-elon-head">
              <div className={`ap-elon-3d ${speaking ? 'talk' : ''}`}><ElonHead3D speaking={speaking || intro.typing} /></div>
              <div>
                <span className="ap-kicker">Elon · Guide IA</span>
                <h2>{speaking ? 'Elon parle…' : `Elon te présente ${nom.toLowerCase()}`}</h2>
              </div>
            </div>

            <div className="ap-elon-text" aria-live="polite">
              {apiError && <div className="ap-alert"><AlertTriangle size={15} aria-hidden="true" /> {apiError}</div>}
              {descLoading ? (
                <>{[92, 80, 86, 60].map((w) => <div key={w} className="shimmer ap-line" style={{ width: `${w}%` }} />)}</>
              ) : (
                <>
                  <RichText text={introText} />
                  {intro.typing && <span className="cursor" />}
                </>
              )}
            </div>

            <div className="ap-actions">
              <button type="button" className="btn btn-primary" onClick={listen} disabled={!description}>
                {speaking ? <><Square size={14} /> Arrêter</> : <><Volume2 size={16} /> Écouter</>}
              </button>
              <button type="button" className="btn btn-ghost" onClick={toggleVoice} aria-pressed={voiceOn}>
                Voix auto : {voiceOn ? 'oui' : 'non'}
              </button>
              {apiError && <button type="button" className="btn btn-ghost" onClick={() => setDescTry((n) => n + 1)}><RefreshCw size={14} /> Réessayer</button>}
            </div>
          </section>

          <section className="ap-card">
            <h2 className="ap-h2">Fiche d'identité</h2>
            <dl className="ap-facts">
              <div><dt><Telescope size={14} /> Observations</dt><dd>{animal.observations_count ? animal.observations_count.toLocaleString('fr-FR') : '—'}</dd></div>
              <div><dt><Camera size={14} /> Photos</dt><dd>{count || '—'}</dd></div>
              <div><dt><Globe size={14} /> Groupe</dt><dd>{taxonLabel}</dd></div>
              <div><dt><ShieldCheck size={14} /> Conservation</dt><dd>{iucn?.label || 'Non renseignée'}</dd></div>
              {lineage.map((a) => (
                <div key={a.id}><dt>{RANKS[a.rank]}</dt><dd>{a.preferred_common_name || a.name}{a.preferred_common_name && <small> {a.name}</small>}</dd></div>
              ))}
            </dl>
          </section>

          {wiki && (
            <section className="ap-card">
              <h2 className="ap-h2">À propos</h2>
              <p className="ap-wiki">{wiki.length > 700 ? `${wiki.slice(0, 700).replace(/\s+\S*$/, '')}…` : wiki}</p>
              {animal.wikipedia_url && (
                <a className="ap-link" href={animal.wikipedia_url} target="_blank" rel="noopener noreferrer">Lire sur Wikipédia <ExternalLink size={13} /></a>
              )}
            </section>
          )}
          {current?.attribution && <p className="ap-credit">Photo : {current.attribution}</p>}
        </div>

        {/* ───── CHAT ───── */}
        <aside className="ap-chat" ref={chatRef}>
          <header className="ap-chat-head"><MessageCircle size={17} aria-hidden="true" /> Discuter avec Elon</header>
          <div className="ap-chat-list" ref={listRef}>
            {chat.length === 0 && !reply.typing && !chatLoading && (
              <div className="ap-chat-empty">
                <p>Pose-moi une question sur {nom.toLowerCase()}, à l'écrit ou au micro.</p>
                <div className="ap-quick">
                  {QUICK.map((q) => <button key={q} type="button" onClick={() => send(q)}>{q}</button>)}
                </div>
              </div>
            )}
            {chat.map((m) => (
              <div key={m.id} className={`ap-msg ${m.role === 'user' ? 'user' : ''}`}>
                <span className="ap-msg-av">{m.role === 'user' ? <UserRound size={14} /> : <Bot size={14} />}</span>
                <div className="ap-msg-bubble"><RichText text={m.text} /></div>
              </div>
            ))}
            {reply.typing && (
              <div className="ap-msg"><span className="ap-msg-av"><Bot size={14} /></span><div className="ap-msg-bubble"><RichText text={reply.text} /><span className="cursor" /></div></div>
            )}
            {chatLoading && <div className="ap-msg"><span className="ap-msg-av"><Bot size={14} /></span><div className="ap-msg-bubble ap-dots">···</div></div>}
          </div>
          <form className="ap-chat-form" onSubmit={(e) => { e.preventDefault(); send(chatInput) }}>
            <input ref={inputRef} value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder={chatLoading ? 'Elon réfléchit…' : 'Pose une question…'} disabled={chatLoading} aria-label="Ta question pour Elon" />
            {mic.supported && (
              <button type="button" className={`ap-mic ${mic.listening ? 'on' : ''}`} onClick={() => (mic.listening ? mic.stop() : mic.start())} aria-label={mic.listening ? 'Arrêter le micro' : 'Parler à Elon'}>
                {mic.listening ? <MicOff size={17} /> : <Mic size={17} />}
              </button>
            )}
            <button type="submit" className="ap-send" disabled={chatLoading || !chatInput.trim()} aria-label="Envoyer"><Send size={16} /></button>
          </form>
        </aside>
      </div>

      {/* ───── LIGHTBOX ───── */}
      {lightbox && current && (
        <div className="ap-lightbox" role="dialog" aria-modal="true" aria-label="Photo en grand" onClick={() => setLightbox(false)}>
          <img src={current.original || current.large} alt={nom} onClick={(e) => e.stopPropagation()} />
          <button type="button" className="icon-btn ap-lb-close" onClick={() => setLightbox(false)} aria-label="Fermer"><X size={18} /></button>
          <button type="button" className="icon-btn ap-lb-prev" onClick={(e) => { e.stopPropagation(); go(-1) }} aria-label="Précédente"><ChevronLeft size={20} /></button>
          <button type="button" className="icon-btn ap-lb-next" onClick={(e) => { e.stopPropagation(); go(1) }} aria-label="Suivante"><ChevronRight size={20} /></button>
        </div>
      )}
    </div>
  )
}
