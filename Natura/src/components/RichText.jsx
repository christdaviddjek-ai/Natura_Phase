// Affiche le **gras** renvoyé par Elon sans injecter de HTML
export default function RichText({ text = '' }) {
  const safe = text.replace(/\*\*([^*]*)$/, '$1') // ** non fermé pendant la frappe
  return safe
    .split(/\n+/)
    .filter(Boolean)
    .map((p, i) => (
      <p key={i}>
        {p.split(/(\*\*[^*]+\*\*)/g).map((s, j) =>
          s.length > 4 && s.startsWith('**') && s.endsWith('**')
            ? <strong key={j}>{s.slice(2, -2)}</strong>
            : s
        )}
      </p>
    ))
}
