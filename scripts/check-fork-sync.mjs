// Does this repository still match the published extension?
//
// WHAT "SOURCE OF TRUTH" MEANS CHANGED WHEN THE EXTENSION WAS PUBLISHED.
// Before the merge, this repository was the source and a fork branch served
// the pull request as a mirror, so drift always meant "fix it here, then
// mirror". PR 31366 merged on 2026-09-30 and raycastbot added a commit to the
// branch first, rewriting {PR_MERGE_DATE} in CHANGELOG.md and re-optimising
// every PNG. Those six files are now authoritative UPSTREAM, and pushing our
// versions back over them would undo work Raycast did on purpose.
//
// So the default target is upstream raycast/extensions main. For source files
// this repository is still the source; for CHANGELOG.md and the images,
// upstream is, and the drift message says which is which rather than assuming.
//
// Compares git blob hashes rather than downloading files: one API call, and a
// hash match is proof of identical bytes. Only committed files are compared on
// this side, so ignored paths (node_modules, dist) never enter the comparison.
//
// Usage:
//   node scripts/check-fork-sync.mjs                        upstream main
//   node scripts/check-fork-sync.mjs --branch <owner>:<ref>  an update PR branch
//   node scripts/check-fork-sync.mjs --repo <owner>/<name> --branch <owner>:<ref>
//
// <ref> is a branch name OR a commit sha, so a specific state can be checked.
// Exit 0 = identical, 1 = drift, 2 = cannot tell.
import { execFileSync } from "node:child_process";

const UPSTREAM = { repo: "raycast/extensions", ref: "main" };
const PREFIX = "extensions/memradar/";
// The fork is deliberately named raycast-extensions while upstream is
// extensions, so an owner alone cannot imply a repository name. This map is
// the resolution; --repo covers anything not listed.
const REPO_FOR_OWNER = { raycast: "raycast/extensions", malcolm15: "malcolm15/raycast-extensions" };
// Deliberately NOT mirrored: this checker is a maintenance tool and MAINTAINING.md
// is internal, and the published extension folder should hold as little
// non-runtime code as possible. Both are expected to be absent upstream.
const LOCAL_ONLY = new Set(["scripts/check-fork-sync.mjs", "MAINTAINING.md"]);
// Owned upstream since the merge: raycastbot rewrites these on every merge, so
// drift here is pulled FROM upstream, never pushed to it.
const UPSTREAM_OWNED = (path) => path === "CHANGELOG.md" || /\.(png|jpe?g|gif|svg)$/i.test(path);

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();

function parseArgs(argv) {
  let { repo, ref } = UPSTREAM;
  let explicitRepo = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--branch") {
      const value = argv[++i];
      if (!value || !value.includes(":")) throw new Error("--branch needs <owner>:<ref>, for example malcolm15:ext/memradar");
      const owner = value.slice(0, value.indexOf(":"));
      ref = value.slice(value.indexOf(":") + 1);
      repo = REPO_FOR_OWNER[owner];
      if (!repo) throw new Error(`no repository known for owner "${owner}"; pass --repo <owner>/<name> as well`);
    } else if (argv[i] === "--repo") {
      explicitRepo = argv[++i];
      if (!explicitRepo || !explicitRepo.includes("/")) throw new Error("--repo needs <owner>/<name>");
    } else {
      throw new Error(`unrecognised argument "${argv[i]}"`);
    }
  }
  return { repo: explicitRepo || repo, ref };
}

async function remoteTree({ repo, ref }) {
  // Addressed as "<ref>:<dir>" so only our subtree comes back: the whole
  // raycast/extensions tree is far past the API's limit and returns truncated.
  const target = `${ref}:${PREFIX.replace(/\/$/, "")}`;
  const url = `https://api.github.com/repos/${repo}/git/trees/${encodeURIComponent(target)}?recursive=1`;
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "memradar-raycast-fork-check" };
  // Optional: lifts the unauthenticated rate limit. gh's token works too.
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`GitHub returned ${res.status} for ${repo} ${target}`);
  const body = await res.json();
  if (body.truncated) throw new Error("the subtree came back truncated; cannot compare reliably");
  const files = new Map();
  for (const entry of body.tree) {
    if (entry.type === "blob") files.set(entry.path, entry.sha);
  }
  return files;
}

try {
  const target = parseArgs(process.argv.slice(2));
  // COMMITTED state on both sides. Hashing the working tree instead would
  // report drift for edits that are simply not committed yet, which is a
  // different problem and gets its own warning below.
  const local = new Map();
  for (const line of git("ls-tree", "-r", "HEAD", "--format=%(objectname) %(path)").split("\n")) {
    const [sha, ...rest] = line.split(" ");
    const path = rest.join(" ");
    if (path && !LOCAL_ONLY.has(path)) local.set(path, sha);
  }
  const dirty = git("status", "--porcelain").split("\n").filter(Boolean);
  const remote = await remoteTree(target);

  const missing = [...local.keys()].filter((p) => !remote.has(p)).sort();
  const extra = [...remote.keys()].filter((p) => !local.has(p) && !LOCAL_ONLY.has(p)).sort();
  const differing = [...local.entries()].filter(([p, sha]) => remote.has(p) && remote.get(p) !== sha).map(([p]) => p).sort();

  console.log(`\nPublished-version check: ${target.repo} ${target.ref} ${PREFIX}\n`);
  console.log(`  local committed files: ${local.size} (${LOCAL_ONLY.size} not mirrored by design)`);
  console.log(`  files on that branch: ${remote.size}`);
  if (dirty.length) {
    console.log(`\n  NOTE: ${dirty.length} uncommitted change(s) here, so they are in neither place yet:`);
    dirty.slice(0, 10).forEach((l) => console.log(`    ${l}`));
  }

  if (!missing.length && !extra.length && !differing.length) {
    console.log("\n  IDENTICAL. Every committed file matches byte for byte.\n");
    process.exit(0);
  }
  console.error("\n  DRIFT. This repository and that branch disagree:\n");
  differing.forEach((p) => console.error(`    DIFFERS       ${p}${UPSTREAM_OWNED(p) ? "  (upstream owns this one)" : ""}`));
  missing.forEach((p) => console.error(`    NOT THERE     ${p}  (copy it across in your update branch)`));
  extra.forEach((p) => console.error(`    ONLY THERE    ${p}  (added upstream? bring it back here first)`));

  const owned = differing.filter(UPSTREAM_OWNED);
  const ours = differing.filter((p) => !UPSTREAM_OWNED(p));
  console.error("");
  if (owned.length) {
    console.error(`  ${owned.length} of these are UPSTREAM-OWNED. raycastbot rewrites CHANGELOG.md and`);
    console.error("  re-optimises images on every merge, so the fix is to PULL those from");
    console.error("  upstream into this repository, never to push ours over them.");
  }
  if (ours.length) {
    console.error(`  ${ours.length} are source files, where this repository is still the source:`);
    console.error("  fix them here, then carry them into an update branch.");
  }
  console.error("");
  process.exit(1);
} catch (err) {
  // Cannot-tell is its own exit code: a network failure must not read as "identical".
  console.error(`\nPublished-version check could not run: ${err.message}\n`);
  process.exit(2);
}
