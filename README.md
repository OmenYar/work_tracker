# App Tracker - Admin Dashboard

Admin dashboard untuk tracking work, PIC, Car, dan CCTV data.

## Tech Stack
- React + Vite
- Tailwind CSS
- Supabase (Database & Authentication)
- shadcn/ui components

## Local Development

1. Clone repository
2. Copy `.env.example` ke `.env` dan isi dengan kredensial Supabase Anda
3. Install dependencies:
   ```bash
   npm install
   ```
4. Jalankan development server:
   ```bash
   npm run dev
   ```

## Deployment ke Vercel

### Cara 1: Via Vercel CLI
```bash
npm i -g vercel
vercel
```

### Cara 2: Via GitHub Integration
1. Push ke GitHub (pastikan `.env` tidak ikut ter-commit!)
2. Buka [vercel.com](https://vercel.com)
3. Import project dari GitHub
4. **PENTING:** Tambahkan Environment Variables di Vercel Dashboard:
   - `VITE_SUPABASE_URL` = URL Supabase Anda
   - `VITE_SUPABASE_ANON_KEY` = Anon Key Supabase Anda

### Environment Variables di Vercel
Buka **Project Settings → Environment Variables** dan tambahkan:

| Variable Name | Value |
|--------------|-------|
| `VITE_SUPABASE_URL` | `https://YOUR_PROJECT.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `your_anon_key_here` |

> ⚠️ **PENTING:** Jangan pernah commit file `.env` yang berisi secret ke Git!

## File Structure
```
├── src/
│   ├── components/     # UI Components
│   ├── pages/          # Page components
│   ├── lib/            # Utilities & Supabase client
│   └── App.jsx         # Main app & routing
├── .env.example        # Template environment variables
├── vercel.json         # Vercel configuration
└── package.json
```

## License
Private
