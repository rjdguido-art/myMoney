# myMoney — expense + credit card tracker

React + Vite single-page app that keeps monthly income, expenses, and credit card cycles in one place. Includes an AI coach that can use OpenAI GPT-4o mini or Gemini 1.5 Flash for tailored budgeting guidance.

## Features
- Track income, expenses (food, transportation, housing, subscriptions, shopping, other), and balances.
- Manage credit cards with closing/payment dates, utilization, and next due alert.
- Banking-style sign-up page (email/password) plus dashboard view toggle.
- Quick calculators (50/30/20 split, utilization targets) and category rollups.
- Firebase Auth: Google sign-in plus email/password login/registration.
- AI coach: send your numbers to OpenAI or Gemini with your own API key, or get local hints with no key.
- Data is stored locally in your browser (localStorage).

## Run locally
```bash
npm install
npm run dev
```

Then open the printed localhost URL.

## Deploy to GitHub Pages
- Build with relative paths (already configured via `vite.config.js`): `npm run build`.
- Publish the `dist/` folder to your `gh-pages` branch (or use an action like `peaceiris/actions-gh-pages`).
- Enable Pages for that branch in repo settings; the site runs as a static SPA.

## Authentication
- Firebase Web SDK is configured in `src/firebase.js` (project `mymoney-e1620`).
- Google sign-in uses a popup. Email/password supports login and registration.
- State comes from Firebase Auth; sign out via the UI.

## AI setup
- OpenAI: paste a key with access to `gpt-4o-mini` (or change the model in `src/App.jsx`).
- Gemini: paste a Gemini API key (tested with `gemini-1.5-flash` endpoint).
- Keys are typed into the UI and never leave your browser storage.
