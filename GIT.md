# Pushing to Git

From inside this folder:

```bash
git init
git add .
git commit -m "Vanilla Concept website"
```

Then create an empty repo on GitHub (no README, no .gitignore — this folder has them) and:

```bash
git remote add origin git@github.com:<you>/vanilla-concept.git
git branch -M main
git push -u origin main
```

## Deploying

**GitHub Pages** — Settings → Pages → Source: `main`, folder: `/ (root)`. Live in a minute at `<you>.github.io/vanilla-concept`.

**Netlify / Vercel / Cloudflare Pages** — import the repo, leave the build command empty, set the publish directory to the repo root.

All four work with no configuration because there is no build step.

## Using with Claude Code

```bash
cd vanilla-concept
claude
```

`CLAUDE.md` loads automatically and carries the project's rules — the no-framework constraint, the five-files-repeat-the-header gotcha, and the bilingual `data-ar` requirement. Read `README.md` for the design tokens and component notes.
