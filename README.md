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
Because GitHub Pages is static, it needs a public backend URL at build time.

Set the repository variable `VITE_API_BASE_URL` to your public API base URL (for example, a stable HTTPS domain or tunnel), then run the Pages workflow.

For the local Docker + Cloudflare quick-tunnel flow:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/sync-pages-api.ps1
```

This script starts the API/tunnel, detects the tunnel URL, sets `VITE_API_BASE_URL`, and triggers the Pages deployment.

> Note: Cloudflare quick tunnels are ephemeral. If the tunnel URL changes, update `VITE_API_BASE_URL` and redeploy Pages, or use a stable named tunnel/domain for a durable setup.
