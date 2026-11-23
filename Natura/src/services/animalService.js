import axios from 'axios'

const BASE_URL = 'https://api.inaturalist.org/v1'

// Règnes/groupes qu'on ne veut pas voir dans la recherche (plantes, champignons…)
const NON_ANIMAL = new Set(['Plantae', 'Fungi', 'Protozoa', 'Chromista'])

export const getAnimalsByCategory = async (taxonId) => {
  const response = await axios.get(`${BASE_URL}/taxa`, {
    params: {
      taxon_id: taxonId,
      rank: 'species',
      per_page: 40,
      locale: 'fr',
      is_active: true,
      order: 'desc',
      order_by: 'observations_count',
    },
  })
  return response.data.results
}

export const searchAnimals = async (query) => {
  const response = await axios.get(`${BASE_URL}/taxa`, {
    params: { q: query, rank: 'species', per_page: 60, locale: 'fr', is_active: true },
  })
  return response.data.results.filter((t) => t.default_photo && !NON_ANIMAL.has(t.iconic_taxon_name))
}

export const getAnimalDetails = async (id) => {
  const response = await axios.get(`${BASE_URL}/taxa/${id}`, { params: { locale: 'fr' } })
  return response.data.results?.[0] || null
}

// URLs d'une photo iNaturalist dans toutes les tailles disponibles
export const photoUrls = (photo) => {
  if (!photo) return null
  const base = photo.url || photo.square_url || photo.medium_url
  return {
    small: photo.square_url || base,
    medium: photo.medium_url || base?.replace('square', 'medium'),
    large: photo.large_url || base?.replace('square', 'large'),
    original: photo.original_url || base?.replace('square', 'original'),
  }
}

// Galerie dédoublonnée : photo par défaut + photos du taxon
export const buildGallery = (animal) => {
  if (!animal) return []
  const seen = new Set()
  const out = []
  const push = (photo, fallbackId) => {
    const u = photoUrls(photo)
    if (!u?.large) return
    const key = photo.id || fallbackId || u.large
    if (seen.has(key)) return
    seen.add(key)
    out.push({ id: key, ...u, attribution: photo.attribution })
  }
  push(animal.default_photo, 'default')
  ;(animal.taxon_photos || []).forEach((tp) => push(tp.photo))
  return out
}

export const CATEGORIES = {
  mammiferes: { id: 40151, label: 'Mammifères', emoji: '🦁' },
  oiseaux: { id: 3, label: 'Oiseaux', emoji: '🦅' },
  reptiles: { id: 26036, label: 'Reptiles', emoji: '🦎' },
  poissons: { id: 47178, label: 'Poissons', emoji: '🐟' },
  amphibiens: { id: 20978, label: 'Amphibiens', emoji: '🐸' },
  insectes: { id: 47158, label: 'Insectes', emoji: '🦋' },
}

export const TAXON_FR = {
  Mammalia: 'Mammifère', Aves: 'Oiseau', Reptilia: 'Reptile', Amphibia: 'Amphibien',
  Actinopterygii: 'Poisson', Insecta: 'Insecte', Arachnida: 'Arachnide', Mollusca: 'Mollusque',
}

export const IUCN = {
  LC: { label: 'Préoccupation mineure', tone: 'ok' },
  NT: { label: 'Quasi menacée', tone: 'warn' },
  VU: { label: 'Vulnérable', tone: 'warn' },
  EN: { label: 'En danger', tone: 'danger' },
  CR: { label: 'En danger critique', tone: 'danger' },
  EW: { label: "Éteinte à l'état sauvage", tone: 'danger' },
  EX: { label: 'Éteinte', tone: 'danger' },
  DD: { label: 'Données insuffisantes', tone: 'muted' },
  NE: { label: 'Non évaluée', tone: 'muted' },
}
