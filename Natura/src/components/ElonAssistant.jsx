import { useEffect, useRef, useState } from 'react'
import { MessageCircle, Send, Volume2, VolumeX, X } from 'lucide-react'
import ElonHead3D from './ElonHead3D'
import RichText from './RichText'
import { appelerElon } from '../services/iaService'
import { speak, stopSpeaking, useTypewriter } from '../hooks/useElon'
import './ElonAssistant.css'

/** Elon flottant : donne des conseils contextuels et répond aux questions pendant l'exploration. */
export default function ElonAssistant({ tip, context }) {
  const [open, setOpen] = useState(false)
  const [showTip, setShowTip] = useState(true)
  const [msgs, setMsgs] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [voice, setVoice] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const tw = useTypewriter()
  const listRef = useRef(null)

  useEffect(() => {
    setShowTip(true)
    const t = setTimeout(() => setShowTip(false), 9000)
    return () => clearTimeout(t)
  }, [tip])

  useEffect(() => () => stopSpeaking(), [])
  useEffect(() => { const l = listRef.current; if (l) l.scrollTop = l.scrollHeight }, [msgs, tw.text, loading])

  const send = async (e) => {
    e?.preventDefault()
    const q = input.trim()
    if (!q || loading) return
    const next = [...msgs, { role: 'user', content: q }]
    setMsgs(next)
    setInput('')
    setLoading(true)
    try {
      const reply = await appelerElon([{ role: 'user', content: `Contexte : ${context || 'exploration de la faune sur Natura'}.` }, ...next])
      setLoading(false)
      if (voice) speak(reply, { onStart: () => setSpeaking(true), onEnd: () => setSpeaking(false) })
      tw.run(reply, () => setMsgs((m) => [...m, { role: 'assistant', content: reply }]))
    } catch {
      setLoading(false)
      setMsgs((m) => [...m, { role: 'assistant', content: "Je n'arrive pas à répondre pour le moment. Réessaie dans un instant !" }])
    }
  }

  const toggleVoice = () => { if (voice) { stopSpeaking(); setSpeaking(false) } setVoice((v) => !v) }

  return (
    <div className="ea-root">
      {open && (
        <section className="ea-panel" aria-label="Discussion avec Elon">
          <header className="ea-head">
            <strong>Elon · Guide IA</strong>
            <div>
              <button type="button" className="ea-mini" onClick={toggleVoice} aria-label={voice ? 'Couper la voix' : 'Activer la voix'}>
                {voice ? <Volume2 size={15} /> : <VolumeX size={15} />}
              </button>
              <button type="button" className="ea-mini" onClick={() => setOpen(false)} aria-label="Fermer"><X size={16} /></button>
            </div>
          </header>
          <div className="ea-list" ref={listRef}>
            {msgs.length === 0 && !tw.typing && <p className="ea-hint">{tip || 'Pose-moi une question sur la faune !'}</p>}
            {msgs.map((m, i) => (
              <div key={i} className={`ea-msg ${m.role === 'user' ? 'user' : ''}`}><RichText text={m.content} /></div>
            ))}
            {tw.typing && <div className="ea-msg"><RichText text={tw.text} /><span className="cursor" /></div>}
            {loading && <div className="ea-msg ea-dots">···</div>}
          </div>
          <form className="ea-form" onSubmit={send}>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ta question…" disabled={loading} aria-label="Ta question pour Elon" />
            <button type="submit" disabled={loading || !input.trim()} aria-label="Envoyer"><Send size={16} /></button>
          </form>
        </section>
      )}

      {!open && showTip && tip && <div className="ea-tip" role="status">{tip}</div>}

      <button type="button" className={`ea-fab ${speaking ? 'talk' : ''}`} onClick={() => setOpen((o) => !o)} aria-label={open ? "Fermer l'assistant Elon" : "Ouvrir l'assistant Elon"}>
        <ElonHead3D speaking={speaking || tw.typing || loading} interactive={false} />
        {!open && <span className="ea-badge"><MessageCircle size={12} /></span>}
      </button>
    </div>
  )
}
