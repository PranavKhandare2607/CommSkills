# CommSkills

AI-powered communication skills platform (pnpm workspace monorepo).

## Local development

```bash
pnpm install
docker compose up -d --build
pnpm --filter @workspace/communication-skills run dev
```

- Frontend: `http://localhost:3000`
- API: `http://localhost:8080`

## GitHub Pages deployment

The frontend is deployed to GitHub Pages by `.github/workflows/deploy-pages.yml`.
GitHub Pages is a **static preview only**: sign-in and AI features need the local API, so the hosted
page shows setup instructions and links to `http://localhost:3000`.

Run the full app locally:

```bash
docker compose up -d --build
```

Then open `http://localhost:3000` and sign in with `testuser@example.com` / `password123`.
