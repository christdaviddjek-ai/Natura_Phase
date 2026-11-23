# 🚀 Guide de Déploiement - NATURA

## ⚠️ Problème: Écran noir lors du clic sur une carte en ligne

Si la page devient noire quand vous cliquez sur une carte après déploiement sur Vercel, c'est probablement dû aux **variables d'environnement manquantes**.

## ✅ Solution: Configurer les variables sur Vercel

### 1️⃣ Accédez à votre projet Vercel

- Allez sur [vercel.com](https://vercel.com)
- Ouvrez le projet `nature-psi-eight`

### 2️⃣ Allez aux Paramètres (Settings)

- Cliquez sur **Settings** en haut
- Sélectionnez **Environment Variables** (Variables d'environnement)

### 3️⃣ Ajoutez les variables requises

#### `GROQ_API_KEY` ⭐ CRITIQUE

- **Clé**: `GROQ_API_KEY`
- **Valeur**: `gsk_xxxxxxxxxxxxx` (votre clé API Groq)
- **Environnements**: Cochez `Production`, `Preview`, `Development`
- **Enregistrez**: Cliquez sur le bouton Save

#### `GROQ_MODEL` (modèle utilisé par Elon)

- **Valeur**: `openai/gpt-oss-120b`
- Cette variable est facultative : le projet utilise cette valeur par défaut si elle n'est pas définie.

---

## 🔑 Où trouver vos clés API?

### Pour GROQ:

1. Allez sur [console.groq.com](https://console.groq.com)
2. Créez une clé API (ou copiez une existante)
3. Collez-la dans Vercel

---

## 🔄 Déploiement après ajout des variables

Après avoir configuré les variables:

### Option 1: Redéployer automatiquement

- Poussez un petit commit:

```bash
git commit --allow-empty -m "redeploy with env vars"
git push
```

### Option 2: Redéploiement manuel

- Allez dans **Deployments** sur Vercel
- Cliquez sur les 3 points du dernier déploiement
- Sélectionnez **Redeploy**

---

## ✨ Vérification

Après redéploiement:

1. Visitez https://nature-psi-eight.vercel.app
2. Cliquez sur une carte d'animal
3. La page devrait charger normalement avec Elon qui vous accueille! 🤖

---

## 📋 Checklist de déploiement

- [ ] `GROQ_API_KEY` configurée sur Vercel
- [ ] Déploiement lancé après ajout des variables
- [ ] Attendre 2-3 minutes pour la compilation
- [ ] Tester la navigation d'une carte vers AnimalPage
- [ ] Vérifier que Elon génère une description

---

## 🐛 Dépannage

**Si l'écran est toujours noir:**

1. **Vérifiez les logs Vercel**:
   - Allez sur Vercel → Deployments → Cliquez sur le dernier
   - Voyez les "Function Logs" pour `/api/elon`

2. **Testez localement**:

   ```bash
   npm run dev
   ```

   Cliquez sur une carte - ça fonctionne?

3. **Vérifiez le `.env.local`**:
   - Assurez-vous que `GROQ_API_KEY` est définie
   - Redémarrez le serveur de dev après modification

4. **Vérifiez les variables Vercel**:
   - Settings → Environment Variables
   - Confirmez que `GROQ_API_KEY` est là avec la bonne valeur

---

## 📝 Note importante

Ne commitez **JAMAIS** votre `.env.local` ou clés API dans Git!

- `.env.local` est déjà dans `.gitignore` ✅
- Les variables sensibles restent sur Vercel uniquement
