# Maintaining this extension

Notes for whoever updates this extension. **This file is not published**: it is
deliberately kept out of the fork branch that serves the pull request, along
with `scripts/check-fork-sync.mjs`, so the store README describes only the
extension itself.

**This repository is the canonical source for the extension.** The pull request against `raycast/extensions` is served from a fork branch, `malcolm15/raycast-extensions` on `ext/memradar`, with the extension under `extensions/memradar/`. That branch is a **mirror**. Never edit it directly: a change made there exists nowhere else, and the next mirror overwrites it.

To update the pull request, either:

- run `npm run publish` from a real terminal, which needs a TTY for the GitHub device-code prompt and will not work from a non-interactive shell, or
- copy the changed files from here into the fork branch and push:

```
git clone --depth 1 --branch ext/memradar https://github.com/malcolm15/raycast-extensions.git
cp <changed files> raycast-extensions/extensions/memradar/...
cd raycast-extensions && git commit -am "..." && git push origin ext/memradar
```

**After any update, confirm the two trees still match:**

```
node scripts/check-fork-sync.mjs
```

It compares git blob hashes for every committed file against the fork branch, so a match is proof of identical bytes. Exit 0 means identical, 1 means drift (it names the files and which side they are on), and 2 means it could not tell, which is deliberately not the same as a pass. `scripts/check-fork-sync.mjs` itself is listed as local-only and is not mirrored, since the published folder should carry as little non-runtime code as possible.
