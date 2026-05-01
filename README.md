# SKU Workshop — Frontend

Pure HTML + CSS + JavaScript. Deploys to **Vercel** in one click.

---

## Deploy on Vercel

### 1. Set your API URL first
Edit `js/config.js`:
```js
API_URL: "https://your-render-service.onrender.com"
```

### 2. Deploy to Vercel
**Option A — Vercel CLI:**
```bash
npm i -g vercel
cd frontend/
vercel
```

**Option B — GitHub:**
1. Push the `frontend/` folder to a GitHub repo
2. Go to https://vercel.com → New Project → Import your repo
3. Set:
   - **Framework Preset:** Other
   - **Root Directory:** `frontend` (or root if you pushed just this folder)
4. Deploy!

Your site will be live at: `https://your-project.vercel.app`

---

## Local Development

Just open `index.html` in a browser, or use any static server:
```bash
npx serve .
# or
python3 -m http.server 3000
```

---

## File Structure

```
frontend/
├── index.html          # Main app
├── vercel.json         # Vercel routing config
├── css/
│   └── style.css       # All styles
└── js/
    ├── config.js       # API URL config (edit this!)
    ├── api.js          # All API calls
    ├── sku.js          # SKU generation logic
    └── app.js          # Main app controller
```
