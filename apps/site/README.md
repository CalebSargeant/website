# apps/site — standalone frontend

A **self-contained** calebsargeant.com frontend that does **not** depend on the
unpublished `@platform/*` upstream or any workspace package — so it installs,
builds, and deploys today while the upstream sourcing is being decided.

- **Single source of truth:** bundles `content/profile.json` at build time.
- **Client-side CV:** generates the PDF in-browser with `jsPDF` (no backend needed).
- **Wow factor:** 3D career timeline (react-three-fiber), terminal mode, ⌘K palette.

## Develop / build

```bash
cd apps/site
pnpm install --ignore-workspace   # isolated from the monorepo workspace
pnpm dev                          # http://localhost:5173
pnpm build                        # -> dist/ (static, deploy anywhere)
```

It's deployed to GitHub Pages by `.github/workflows/pages.yml` on push.

> AI features (Ask my CV, Tailor CV) live in the backend-connected `apps/web`.
> This static build intentionally ships the no-backend subset.
