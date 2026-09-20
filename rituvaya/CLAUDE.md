# CLAUDE.md — Rituvaya (mobile app)

This folder is a separate Expo (React Native + TypeScript) project inside the Vanilla repository. The bakery site rules in the repository root do **not** apply here.

- Read `README.md` for how to run, test and ship, and `docs/PLAN.md` for architecture.
- Domain logic lives in `src/domain` and is pure TypeScript with Jest tests (`npm test`). Keep it free of React and Expo imports.
- Storage goes through the `Repository` interface (`src/storage`); SQLite on devices, in-memory + localStorage on the web preview.
- All visible text goes through `src/i18n` (`t('key')`). Adding a key means adding it to all five translation files; the i18n test enforces this.
- Use logical layout (`marginStart`, `paddingEnd`, `flexDirection: 'row'`), the `Text` component (never raw `RNText`), and theme tokens (never hard-coded colours).
- Check `npm run typecheck` and `npm test` before finishing. The web preview (`npm run web` + `node scripts/screenshots.js`) is how screens are inspected here.
