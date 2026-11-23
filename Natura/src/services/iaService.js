// Appels à la route serverless /api/elon (clé Groq jamais exposée au navigateur)
const inflight = new Map()

const callApiElon = async (payload) => {
  let response
  try {
    response = await fetch('/api/elon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new Error('Impossible de contacter /api/elon — lance le projet avec "vercel dev"')
  }

  const text = await response.text()
  if (!text) throw new Error(`API /api/elon : ${response.status} ${response.statusText} (réponse vide)`)

  let data
  try { data = JSON.parse(text) } catch { throw new Error(`Réponse invalide de /api/elon : ${text.slice(0, 120)}`) }
  if (!response.ok) throw new Error(data.error || `Erreur API Elon (${response.status})`)
  if (!data.reply) throw new Error('Elon a renvoyé une réponse vide')
  return data.reply
}

export const appelerElon = (messages) => callApiElon({ type: 'chat', messages })

// Présentation d'un animal : mise en cache (session) + une seule requête en vol par animal
export const decrireAnimal = (animal) => {
  const key = `natura_desc_${animal.id}`
  try {
    const cached = sessionStorage.getItem(key)
    if (cached) return Promise.resolve(cached)
  } catch { /* ignore */ }
  if (inflight.has(key)) return inflight.get(key)

  const slim = {
    id: animal.id,
    name: animal.name,
    preferred_common_name: animal.preferred_common_name,
    iconic_taxon_name: animal.iconic_taxon_name,
    observations_count: animal.observations_count,
  }
  const p = callApiElon({ type: 'describe', animal: slim })
    .then((reply) => { try { sessionStorage.setItem(key, reply) } catch { /* ignore */ } return reply })
    .finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}
