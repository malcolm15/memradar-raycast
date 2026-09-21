// Is the PR branch still a faithful mirror of this repository?
//
// THIS REPO IS THE SOURCE. The pull request against raycast/extensions is
// served from a fork branch (malcolm15/raycast-extensions, ext/memradar,
// under extensions/memradar/), which is a MIRROR and is never edited directly.
// Nothing enforces that on its own, so this checks it: an edit made in the
// fork, or a file that never got copied across, shows up here rather than as a
// surprise weeks later when the two have quietly diverged.
//
// Compares git blob hashes rather than downloading files: one API call, and a
// hash match is proof of identical bytes. Only committed files are compared on
// this side, so ignored paths (node_modules, dist) never enter the comparison.
//
// Usage: npm run check-fork     (exit 0 = identical, 1 = drift, 2 = cannot tell)
import { execFileSync } from "node:child_process";

const FORK = "malcolm15/raycast-extensions";
const BRANCH = "ext/memradar";
const PREFIX = "extensions/memradar/";
// Deliberately NOT mirrored: this checker is a maintenance tool, and the
// published extension folder should hold as little non-runtime code as
// possible. Anything listed here is expected to be absent from the fork.
const LOCAL_ONLY = new Set(["scripts/check-fork-sync.mjs", "MAINTAINING.md"]);

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();

async function forkTree() {
  // Addressed as "<branch>:<dir>" so only our subtree comes back: the whole
  // raycast/extensions tree is far past the API's limit and returns truncated.
  const ref = `${BRANCH}:${PREFIX.replace(/\/$/, "")}`;
  const url = `https://api.github.com/repos/${FORK}/git/trees/${encodeURIComponent(ref)}?recursive=1`;
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "memradar-raycast-fork-check" };
  // Optional: lifts the unauthenticated rate limit. gh's token works too.
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`GitHub returned ${res.status} for the fork tree`);
  const body = await res.json();
  if (body.truncated) throw new Error("the fork subtree came back truncated; cannot compare reliably");
  const files = new Map();
  for (const entry of body.tree) {
    if (entry.type === "blob") files.set(entry.path, entry.sha);
  }
  return files;
}

try {
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
  const fork = await forkTree();

  const missing = [...local.keys()].filter((p) => !fork.has(p)).sort();
  const extra = [...fork.keys()].filter((p) => !local.has(p) && !LOCAL_ONLY.has(p)).sort();
  const differing = [...local.entries()].filter(([p, sha]) => fork.has(p) && fork.get(p) !== sha).map(([p]) => p).sort();

  console.log(`\nFork mirror check: ${FORK} ${BRANCH} ${PREFIX}\n`);
  console.log(`  local committed files: ${local.size} (${LOCAL_ONLY.size} not mirrored by design)`);
  console.log(`  files on the fork branch: ${fork.size}`);
  if (dirty.length) {
    console.log(`\n  NOTE: ${dirty.length} uncommitted change(s) here, so they are in neither place yet:`);
    dirty.slice(0, 10).forEach((l) => console.log(`    ${l}`));
  }

  if (!missing.length && !extra.length && !differing.length) {
    console.log("\n  IDENTICAL. Every committed file matches the fork byte for byte.\n");
    process.exit(0);
  }
  console.error("\n  DRIFT. The fork is no longer a faithful mirror:\n");
  differing.forEach((p) => console.error(`    DIFFERS       ${p}`));
  missing.forEach((p) => console.error(`    NOT ON FORK   ${p}  (copy it across and push)`));
  extra.forEach((p) => console.error(`    ONLY ON FORK  ${p}  (edited there? bring it back here first)`));
  console.error("\n  This repo is the source. Fix it here, then mirror; never the other way round.\n");
  process.exit(1);
} catch (err) {
  // Cannot-tell is its own exit code: a network failure must not read as "identical".
  console.error(`\nFork mirror check could not run: ${err.message}\n`);
  process.exit(2);
}
