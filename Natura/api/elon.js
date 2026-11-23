import Groq from 'groq-sdk'

const ELON_SYSTEM = `Tu es Elon, le guide naturaliste IA de NATURA. Tu es passionné, précis et captivant. Tu parles toujours en français.

Quand tu présentes un animal pour la première fois, tu couvres TOUJOURS ces points dans cet ordre :
1. **Localisation & habitat** : où vit-il, quel environnement, quel climat
2. **Comportement** : chasse, alimentation, déplacements, vie solitaire ou en groupe
3. **Forces & adaptations** : vitesse, force, sens, camouflage…
4. **Faiblesses & menaces** : prédateurs, vulnérabilités, statut de conservation
5. **Fait fascinant** : une donnée surprenante ou un record

Présentation : 6 à 8 phrases, concrètes et chiffrées quand possible, ton vivant, jamais scolaire. Tu n'inventes rien : si tu n'es pas sûr d'un chiffre, tu le dis.
Chat de suivi : 2 à 4 phrases, précises et directes.`

// Modèle configurable via GROQ_MODEL. Par défaut un modèle non "raisonnant" : les modèles
// de raisonnement consomment leurs tokens en réflexion et renvoient parfois une réponse vide.
const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
const REASONING = /^(openai\/gpt-oss|qwen\/)/.test(MODEL)

const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f]/g, ' ').slice(0, max)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY not configured' })

  const { type, messages, animal } = req.body || {}
  const client = new Groq({ apiKey })

  const ask = async (msgs, maxTokens) => {
    const r = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.7,
      max_completion_tokens: REASONING ? maxTokens + 1500 : maxTokens,
      ...(MODEL.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {}),
      messages: [{ role: 'system', content: ELON_SYSTEM }, ...msgs],
    })
    return r.choices?.[0]?.message?.content?.trim() || ''
  }

  try {
    if (type === 'chat') {
      if (!Array.isArray(messages) || messages.length === 0) return res.status(400).json({ error: 'Missing or invalid messages' })
      // Le client ne peut envoyer que des rôles user/assistant (jamais "system")
      const safe = messages
        .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
        .slice(-14)
        .map((m) => ({ role: m.role, content: clean(m.content, 2000) }))
      return res.status(200).json({ reply: await ask(safe, 450) })
    }

    if (type === 'describe') {
      if (!animal || typeof animal !== 'object') return res.status(400).json({ error: 'Missing or invalid animal data' })
      const nom = clean(animal.preferred_common_name || animal.name || 'cet animal', 120)
      const sci = clean(animal.name, 120)
      const cat = clean(animal.iconic_taxon_name, 60)
      const obs = Number(animal.observations_count) ? `(${Number(animal.observations_count).toLocaleString('fr-FR')} observations)` : ''
      const prompt = `Présente-moi cet animal : "${nom}" (${sci}), groupe : ${cat} ${obs}.
Couvre : localisation et habitat, comportement, forces et adaptations, faiblesses et menaces, puis un fait fascinant. Sois précis et concret.`
      return res.status(200).json({ reply: await ask([{ role: 'user', content: prompt }], 700) })
    }

    return res.status(400).json({ error: 'Invalid request type' })
  } catch (error) {
    console.error('API error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
