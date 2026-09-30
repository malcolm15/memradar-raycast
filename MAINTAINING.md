# Maintaining this extension

Notes for whoever updates this extension. **This file is not published**: it
is deliberately kept out of `extensions/memradar/`, along with
`scripts/check-fork-sync.mjs`, so the store README describes only the
extension itself.

**PUBLISHED SINCE 2026-09-30.** Pull request 31366 merged as `b8676852f`, and
the extension is live at <https://www.raycast.com/memradar/memradar>. What is
in `raycast/extensions` main under `extensions/memradar/` IS the published
extension. This repository is still where changes are written, but it is no
longer the only authority: see the two files below that upstream owns.

`malcolm15/raycast-extensions` on `ext/memradar` is the branch that served
that pull request. **It is merged and kept only as history. Never reuse it.**
Reopening against a merged branch produces a pull request whose diff carries
the already-merged work.

## Making an update

One branch per change, cut from upstream `raycast/extensions` main, never from
`ext/memradar`. Either run `npm run publish` from a real terminal, which needs
a TTY for the GitHub device-code prompt and will not work from a
non-interactive shell, or do it by hand:

```
git clone --filter=blob:none --sparse --depth 1 \
  https://github.com/raycast/extensions.git
cd extensions && git sparse-checkout set extensions/memradar
git checkout -b memradar/<what-this-changes>
cp <changed files> extensions/memradar/...
git commit -am "..." && git push <your fork> memradar/<what-this-changes>
```

Then open a pull request against `raycast/extensions` main.

**Use the sparse partial clone, not a plain `--depth 1`.** `raycast/extensions`
carries every published extension, so shallow alone still fetches every blob at
the tip: measured 2026-09-29, a plain `--depth 1` clone reached **7.8 GB** and
was still running when it was killed, while `--filter=blob:none --sparse` plus
`sparse-checkout set extensions/memradar` produced a working tree of **32 MB**.
`--filter=blob:none` defers blob download until a file is actually needed, and
the sparse checkout means only this extension's files ever are.

## After the merge, sync back

**raycastbot rewrites two kinds of file on every merge**, so they come FROM
upstream and are never pushed from here:

- `CHANGELOG.md`, where `{PR_MERGE_DATE}` becomes the merge date.
- Every image. On the first merge it recompressed all five PNGs, saving about
  7 MB: the dark icon went RGBA to palette and the metadata screenshots RGBA
  to RGB. That was verified lossless, pixel identical at unchanged dimensions,
  but verify it again rather than assuming, because palettising and dropping
  an alpha channel can both lose information.

So after a merge, copy those files from upstream into this repository and
commit them here. Do not "fix" them in the other direction.

**After any update, confirm this repository matches what is published:**

```
node scripts/check-fork-sync.mjs                       # upstream main, the published version
node scripts/check-fork-sync.mjs --branch <owner>:<ref>  # an update branch in flight
```

With no arguments it compares against upstream `raycast/extensions` main, which is the published extension. `--branch <owner>:<ref>` points it somewhere else while an update is open; `<ref>` is a branch name or a commit sha. It compares git blob hashes for every committed file, so a match is proof of identical bytes. Exit 0 means identical, 1 means drift (it names the files, and marks the ones upstream owns), and 2 means it could not tell, which is deliberately not the same as a pass. `scripts/check-fork-sync.mjs` and this file are local-only and are not published, since the extension folder should carry as little non-runtime code as possible.
