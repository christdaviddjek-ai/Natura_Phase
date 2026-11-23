# 🌿 NATURA — Animal Discovery Platform

## 🚀 Déploiement sur Vercel (5 minutes)

### 1. Prépare ton dépôt GitHub
```bash
git add .
git commit -m "Ready for Vercel"
git push
```

### 2. Importe sur Vercel
1. Va sur [vercel.com](https://vercel.com) → **New Project**
2. Importe ton repo GitHub `natura`
3. Vercel détecte automatiquement **Vite** → garde les paramètres par défaut
4. Click **Deploy** *(le premier déploiement échouera sans les variables d'env — c'est normal)*

### 3. Ajoute ta clé API Groq
Dans Vercel → **Settings → Environment Variables** :

| Nom | Valeur |
|-----|--------|
| `GROQ_API_KEY` | `gsk_xxxxxxxxxxxxx` (ta vraie clé Groq) |
| `GROQ_MODEL` | `openai/gpt-oss-120b` |

*(Optionnel)* Si tu utilises aussi l'API Anthropic :

| Nom | Valeur |
|-----|--------|
| `ANTHROPIC_API_KEY` | `sk-ant-xxxxxxxxxx` |

### 4. Redéploie
Vercel → **Deployments → Redeploy** → et c'est en ligne ! 🎉

---

## 🔧 Dev local

```bash
npm install
npm run dev
```

Pour tester les API routes en local, utilise [Vercel CLI](https://vercel.com/docs/cli) :
```bash
npm i -g vercel
vercel dev
```

---

## 📁 Structure du projet

```
natura/
├── api/
│   ├── elon.js          # Route serverless → Groq (guide IA Elon)
│   └── anthropic.js     # Route serverless → Anthropic (optionnel)
├── src/
│   ├── pages/
│   │   ├── HomePage.jsx
│   │   └── AnimalPage.jsx
│   ├── components/
│   │   └── AnimalCard.jsx
│   └── services/
│       ├── animalService.js   # API iNaturalist
│       └── iaService.js       # Appels à /api/elon
├── vercel.json          # Config routing SPA + API
├── .env.example         # Template variables d'env
└── index.html
```

## 🔑 Obtenir une clé API Groq (gratuit)
→ [console.groq.com](https://console.groq.com)
