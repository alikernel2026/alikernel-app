# alikernel-astro (Converted)

This is a direct conversion of your static HTML/CSS/JS into an Astro project **without changing the design**.

## Local / Codespaces
```bash
npm install
npm run dev -- --host 0.0.0.0 --port 4321
```

## Build
```bash
npm run build
npm run preview -- --host 0.0.0.0 --port 4321
```

## Routes
- `/` redirects to your Blogger (same as original).
- `/login` is `src/pages/login.astro`
- `/account` is `src/pages/account.astro`

Static assets are in `/public`:
- `/style.css`
- `/auth.js`
