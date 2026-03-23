# AI Studio — Frontend

Next.js 14 frontend for AI Studio platform.

## Deploy to Cloudflare Pages

1. Push this repo to GitHub
2. Go to Cloudflare Dashboard → Pages → Create Project
3. Connect this GitHub repo
4. Set build settings:
   - Framework: Next.js
   - Build command: `npm run build`
   - Output directory: `.next`
5. Add environment variable:
   - `NEXT_PUBLIC_API_URL` = your Railway backend URL
6. Click Deploy

## Local Development

```bash
cp .env.example .env.local
# Edit .env.local with your backend URL

npm install
npm run dev
# → http://localhost:3000
```
