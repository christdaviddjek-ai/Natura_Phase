import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import './ElonHead3D.css'

const readColor = (name, fallback) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return new THREE.Color(v || fallback)
}

/**
 * Tête 3D procédurale d'Elon (aucun asset externe).
 * - speaking : la bouche s'anime, les yeux pulsent
 * - pose     : { yaw, pitch, roll } pour orienter la tête (visite guidée)
 * - interactive : la tête suit le curseur
 */
export default function ElonHead3D({ speaking = false, pose = null, interactive = true, className = '' }) {
  const mountRef = useRef(null)
  const live = useRef({ speaking, pose })
  const [failed, setFailed] = useState(false)

  useEffect(() => { live.current = { speaking, pose } }, [speaking, pose])

  useEffect(() => {
    const el = mountRef.current
    if (!el) return undefined

    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
    } catch {
      setFailed(true)
      return undefined
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60)
    camera.position.set(0, 0.1, 7.4)

    let accent = readColor('--accent', '#22c55e')
    let accent2 = readColor('--accent2', '#4ade80')

    const head = new THREE.Group()
    scene.add(head)

    // Crâne + maillage filaire
    const skullMat = new THREE.MeshStandardMaterial({ color: 0x0f2a1c, roughness: 0.38, metalness: 0.35 })
    const skull = new THREE.Mesh(new THREE.SphereGeometry(1.25, 48, 48), skullMat)
    skull.scale.set(1, 1.1, 0.95)
    head.add(skull)
    const wireMat = new THREE.MeshBasicMaterial({ color: accent, wireframe: true, transparent: true, opacity: 0.22 })
    const wire = new THREE.Mesh(new THREE.IcosahedronGeometry(1.34, 2), wireMat)
    wire.scale.copy(skull.scale)
    head.add(wire)

    // Visière
    const visor = new THREE.Mesh(
      new THREE.SphereGeometry(1, 40, 24),
      new THREE.MeshStandardMaterial({ color: 0x03110a, roughness: 0.15, metalness: 0.8 })
    )
    visor.scale.set(0.86, 0.46, 0.34)
    visor.position.set(0, 0.12, 0.92)
    head.add(visor)

    // Yeux
    const eyeMat = new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 1 })
    const eyeGeo = new THREE.SphereGeometry(0.12, 24, 24)
    const eyes = [-1, 1].map((s) => {
      const e = new THREE.Mesh(eyeGeo, eyeMat)
      e.scale.set(1, 1, 0.5)
      e.position.set(s * 0.36, 0.14, 1.2)
      head.add(e)
      return e
    })

    // Bouche (barres type égaliseur)
    const mouthMat = new THREE.MeshStandardMaterial({ color: accent2, emissive: accent2, emissiveIntensity: 0.9 })
    const barGeo = new THREE.BoxGeometry(0.065, 1, 0.05)
    const bars = Array.from({ length: 7 }, (_, i) => {
      const b = new THREE.Mesh(barGeo, mouthMat)
      b.position.set((i - 3) * 0.115, -0.62, 1.08)
      b.scale.y = 0.05
      head.add(b)
      return b
    })

    // Oreilles
    const earMat = new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.5, metalness: 0.5, roughness: 0.3 })
    ;[-1, 1].forEach((s) => {
      const ear = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.055, 12, 32), earMat)
      ear.position.set(s * 1.27, 0.05, 0)
      ear.rotation.y = Math.PI / 2
      head.add(ear)
    })

    // Antenne feuille
    const antenna = new THREE.Group()
    antenna.position.set(0, 1.3, 0)
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.035, 0.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x1f5e3a, roughness: 0.6 })
    )
    stem.position.y = 0.25
    const leafMat = new THREE.MeshStandardMaterial({ color: accent2, emissive: accent2, emissiveIntensity: 0.55, roughness: 0.4 })
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 20), leafMat)
    leaf.scale.set(0.55, 1.1, 0.2)
    leaf.position.set(0.1, 0.65, 0)
    leaf.rotation.z = -0.5
    antenna.add(stem, leaf)
    head.add(antenna)

    // Anneau orbital + "jetons" d'espèces
    const orbit = new THREE.Group()
    orbit.rotation.x = 1.25
    orbit.rotation.z = 0.25
    scene.add(orbit)
    const ringMat = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.35 })
    orbit.add(new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.01, 8, 160), ringMat))
    ;[0x4ade80, 0xfacc15, 0x38bdf8, 0xfb923c].forEach((c, i) => {
      const tok = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 16), new THREE.MeshBasicMaterial({ color: c }))
      const a = (i / 4) * Math.PI * 2
      tok.position.set(Math.cos(a) * 2.1, Math.sin(a) * 2.1, 0)
      orbit.add(tok)
    })

    // Particules
    const N = 140
    const pos = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      const r = 2.3 + Math.random() * 1.3
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th)
      pos[i * 3 + 1] = r * Math.cos(ph) * 0.8
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th)
    }
    const pGeo = new THREE.BufferGeometry()
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const pMat = new THREE.PointsMaterial({ color: accent2, size: 0.04, transparent: true, opacity: 0.7, sizeAttenuation: true })
    const particles = new THREE.Points(pGeo, pMat)
    scene.add(particles)

    // Lumières
    scene.add(new THREE.AmbientLight(0xffffff, 0.9))
    const key = new THREE.DirectionalLight(0xffffff, 2.2)
    key.position.set(3, 4, 5)
    scene.add(key)
    const rim = new THREE.PointLight(accent, 30, 0, 2)
    rim.position.set(-3, 1, -2)
    scene.add(rim)

    const applyTheme = () => {
      accent = readColor('--accent', '#22c55e')
      accent2 = readColor('--accent2', '#4ade80')
      wireMat.color.copy(accent)
      ringMat.color.copy(accent)
      eyeMat.color.copy(accent); eyeMat.emissive.copy(accent)
      mouthMat.color.copy(accent2); mouthMat.emissive.copy(accent2)
      earMat.color.copy(accent); earMat.emissive.copy(accent)
      leafMat.color.copy(accent2); leafMat.emissive.copy(accent2)
      pMat.color.copy(accent2)
      rim.color.copy(accent)
    }
    const themeObserver = new MutationObserver(applyTheme)
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    const resize = () => {
      const w = el.clientWidth || 1
      const h = el.clientHeight || 1
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.position.z = 7.4 / Math.min(1, camera.aspect * 1.05)
      camera.updateProjectionMatrix()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(el)

    let visible = true
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting })
    io.observe(el)

    const look = { x: 0, y: 0 }
    const target = { x: 0, y: 0 }
    const onMove = (e) => {
      const r = el.getBoundingClientRect()
      target.x = THREE.MathUtils.clamp((e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2), -1, 1)
      target.y = THREE.MathUtils.clamp((e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2), -1, 1)
    }
    if (interactive) window.addEventListener('pointermove', onMove, { passive: true })

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const clock = new THREE.Clock()
    let raf = 0
    let blinkAt = 2
    let blink = 0
    let mouthLevel = 0

    const frame = () => {
      raf = requestAnimationFrame(frame)
      if (!visible) { clock.getDelta(); return }
      const dt = Math.min(clock.getDelta(), 0.05)
      const t = clock.elapsedTime
      const { speaking: talk, pose: p } = live.current
      const k = 1 - Math.pow(0.002, dt)

      look.x += (target.x - look.x) * k
      look.y += (target.y - look.y) * k
      const yaw = look.x * 0.55 + (p?.yaw || 0)
      const pitch = look.y * 0.3 + (p?.pitch || 0)
      head.rotation.y += (yaw - head.rotation.y) * k
      head.rotation.x += (pitch - head.rotation.x) * k
      head.rotation.z += ((p?.roll || 0) - head.rotation.z) * k
      head.position.y = reduce ? 0 : Math.sin(t * 1.3) * 0.07

      if (t > blinkAt) { blink = 1; blinkAt = t + 2.5 + Math.random() * 3 }
      blink = Math.max(0, blink - dt * 7)
      const lid = 1 - 0.9 * Math.sin(blink * Math.PI)
      eyes.forEach((e, i) => {
        e.scale.y = lid
        e.position.x = (i === 0 ? -0.36 : 0.36) + look.x * 0.05
        e.position.y = 0.14 - look.y * 0.03
      })
      eyeMat.emissiveIntensity = talk ? 1.1 + 0.5 * Math.sin(t * 10) : 0.9 + 0.15 * Math.sin(t * 2)

      mouthLevel += ((talk ? 1 : 0) - mouthLevel) * Math.min(1, dt * 10)
      bars.forEach((b, i) => {
        const env = 1 - Math.abs(i - 3) / 5
        const talkH = (0.15 + 0.85 * Math.abs(Math.sin(t * 13 + i * 1.4))) * 0.3 * env
        const idleH = 0.05 + 0.012 * Math.sin(t * 2 + i)
        b.scale.y = Math.max(0.04, idleH + (talkH - idleH) * mouthLevel)
      })

      antenna.rotation.z = Math.sin(t * 1.7) * 0.12 - look.x * 0.1
      orbit.rotation.y = t * (talk ? 0.9 : 0.35)
      wire.rotation.y = t * 0.1
      particles.rotation.y = t * 0.04

      renderer.render(scene, camera)
    }
    frame()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      ro.disconnect(); io.disconnect(); themeObserver.disconnect()
      scene.traverse((o) => {
        o.geometry?.dispose?.()
        const m = o.material
        if (Array.isArray(m)) m.forEach((x) => x.dispose()); else m?.dispose?.()
      })
      renderer.dispose()
      renderer.forceContextLoss?.()
      renderer.domElement.remove()
    }
  }, [interactive])

  if (failed) {
    return (
      <div className={`elon3d elon3d-fallback ${className}`} role="img" aria-label="Elon, guide IA de Natura">
        <div className={`elon3d-orb ${speaking ? 'talk' : ''}`} />
      </div>
    )
  }
  return <div ref={mountRef} className={`elon3d ${className}`} role="img" aria-label="Elon, guide IA de Natura en 3D" />
}
