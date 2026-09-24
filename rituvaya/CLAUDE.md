# CLAUDE.md — Rituvaya (mobile app)

This folder is a separate Expo (React Native + TypeScript) project inside the Vanilla repository. The bakery site rules in the repository root do **not** apply here.

- Read `README.md` for how to run, test and ship, and `docs/PLAN.md` for architecture.
- Domain logic lives in `src/domain` and is pure TypeScript with Jest tests (`npm test`). Keep it free of React and Expo imports.
- Storage goes through the `Repository` interface (`src/storage`); SQLite on devices, in-memory + localStorage on the web preview.
- All visible text goes through `src/i18n` (`t('key')`). Adding a key means adding it to all five translation files; the i18n test enforces this.
- Use logical layout (`marginStart`, `paddingEnd`, `flexDirection: 'row'`), the `Text` component (never raw `RNText`), and theme tokens (never hard-coded colours).
- Check `npm run typecheck` and `npm test` before finishing. The web preview (`npm run web` + `node scripts/screenshots.js`) is how screens are inspected here.
- The Apple Watch app is native SwiftUI in `targets/watch/`, generated into the Xcode project by `@bacons/apple-targets`. The phone side is `src/watch/` and `src/features/WatchBridge.tsx`. The payload shape is defined twice — `src/watch/payload.ts` and `targets/watch/Models.swift` — so change both together and bump `WATCH_PAYLOAD_VERSION` for incompatible changes. The Swift can't be compiled in a Linux sandbox; at least syntax-check it.
- Native config lives in `app.json` plus the plugins in `plugins/`. After changing either, run `npx expo prebuild --platform ios --no-install` and inspect the generated `ios/` project rather than assuming a plugin applied — mod ordering is reverse registration order and has bitten this project before.
