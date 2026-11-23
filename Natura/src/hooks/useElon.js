import { useCallback, useEffect, useRef, useState } from 'react'

/* ───────── Synthèse vocale ───────── */
let speakToken = 0

export const cleanForSpeech = (t = '') =>
  t.replace(/[*_#`>]/g, '').replace(/\s+/g, ' ').trim()

export function stopSpeaking() {
  speakToken++
  try { window.speechSynthesis?.cancel() } catch { /* ignore */ }
}

// Découpe en petites phrases : Chrome coupe les longs textes au bout de ~15 s
export function speak(text, { onStart, onEnd } = {}) {
  const synth = window.speechSynthesis
  const clean = cleanForSpeech(text)
  if (!synth || !clean) { onEnd?.(); return }
  stopSpeaking()
  const token = speakToken
  const sentences = clean.match(/[^.!?…]+[.!?…]*\s*/g) || [clean]
  const chunks = []
  sentences.forEach((s) => {
    const last = chunks[chunks.length - 1]
    if (last && (last + s).length < 200) chunks[chunks.length - 1] = last + s
    else chunks.push(s)
  })
  const fr = synth.getVoices().find((v) => v.lang?.toLowerCase().startsWith('fr'))
  let i = 0
  const next = () => {
    if (token !== speakToken) return
    if (i >= chunks.length) { onEnd?.(); return }
    const u = new SpeechSynthesisUtterance(chunks[i++])
    u.lang = 'fr-FR'
    u.rate = 0.96
    u.pitch = 1
    if (fr) u.voice = fr
    u.onend = next
    u.onerror = () => { if (token === speakToken) onEnd?.() }
    synth.speak(u)
  }
  onStart?.()
  next()
}

/* ───────── Reconnaissance vocale ───────── */
export function useSpeechRecognition(onResult) {
  const recRef = useRef(null)
  const cbRef = useRef(onResult)
  const [listening, setListening] = useState(false)
  useEffect(() => { cbRef.current = onResult })

  const supported = typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)

  const stop = useCallback(() => { try { recRef.current?.stop() } catch { /* ignore */ } }, [])
  const start = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return false
    const rec = new SR()
    rec.lang = 'fr-FR'
    rec.interimResults = false
    rec.onresult = (e) => { const txt = e.results?.[0]?.[0]?.transcript; if (txt) cbRef.current?.(txt) }
    rec.onerror = () => setListening(false)
    rec.onend = () => { setListening(false); recRef.current = null }
    try { rec.start() } catch { return false }
    recRef.current = rec
    setListening(true)
    return true
  }, [])

  useEffect(() => () => { try { recRef.current?.abort() } catch { /* ignore */ } }, [])
  return { start, stop, listening, supported }
}

/* ───────── Effet machine à écrire (nettoyé au démontage) ───────── */
export function useTypewriter() {
  const [text, setText] = useState('')
  const [typing, setTyping] = useState(false)
  const timer = useRef(null)

  const cancel = useCallback(() => { clearTimeout(timer.current); setTyping(false) }, [])
  const run = useCallback((full, onDone) => {
    clearTimeout(timer.current)
    if (!full) { setText(''); setTyping(false); onDone?.(); return }
    setTyping(true)
    let i = 0
    const step = Math.max(1, Math.ceil(full.length / 900))
    const delay = Math.max(8, Math.min(24, Math.floor(3500 / full.length)))
    const tick = () => {
      i = Math.min(full.length, i + step)
      setText(full.slice(0, i))
      if (i < full.length) timer.current = setTimeout(tick, delay)
      else { setTyping(false); onDone?.() }
    }
    tick()
  }, [])
  useEffect(() => () => clearTimeout(timer.current), [])
  return { text, typing, run, cancel, setText }
}
