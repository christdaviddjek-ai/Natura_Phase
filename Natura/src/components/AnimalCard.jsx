import { useNavigate } from 'react-router-dom'
import { ArrowRight, Leaf, MessageCircle } from 'lucide-react'
import { TAXON_FR } from '../services/animalService'
import './AnimalCard.css'

export default function AnimalCard({ animal, onClick, category }) {
  const navigate = useNavigate()
  const name = animal.preferred_common_name || animal.name || 'Animal inconnu'
  const imageUrl = animal.default_photo?.medium_url || animal.default_photo?.url
  const open = () => (onClick ? onClick(animal) : navigate(`/animal/${animal.id}`, { state: { animal, fromCategory: category } }))
  const openChat = () => navigate(`/animal/${animal.id}`, { state: { animal, openChat: true, fromCategory: category } })

  return (
    <article className="animal-card">
      <button type="button" className="animal-card-main" onClick={open} aria-label={`Ouvrir la fiche : ${name}`}>
        <span className="animal-card-media">
          {imageUrl ? (
            <img src={imageUrl} alt="" loading="lazy" decoding="async" />
          ) : (
            <span className="animal-card-empty"><Leaf size={48} strokeWidth={1.1} aria-hidden="true" /></span>
          )}
          <span className="animal-card-shade" />
          <span className="animal-card-tag">{TAXON_FR[animal.iconic_taxon_name] || animal.iconic_taxon_name || 'Espèce'}</span>
        </span>
        <span className="animal-card-body">
          <span className="animal-card-name">{name}</span>
          <span className="animal-card-sci">{animal.name}</span>
          <span className="animal-card-cta">Explorer <ArrowRight size={13} strokeWidth={2} aria-hidden="true" /></span>
        </span>
      </button>
      <button type="button" className="animal-card-chat" onClick={openChat} title="Discuter avec Elon" aria-label={`Discuter de ${name} avec Elon`}>
        <MessageCircle size={17} strokeWidth={1.8} aria-hidden="true" />
      </button>
    </article>
  )
}
