import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const tempRoot = mkdtempSync(join(tmpdir(), "os-probabilities-smoke-"));
const tarballDir = join(tempRoot, "tarballs");
const appDir = join(tempRoot, "app");

const workspaces = [
  packageInfo("packages/core/package.json"),
  packageInfo("packages/schema/package.json"),
  packageInfo("packages/adapters/package.json"),
  packageInfo("packages/cli/package.json")
];

mkdirSync(tarballDir, { recursive: true });
mkdirSync(appDir, { recursive: true });

run("npm", ["run", "build"], repoRoot);
run("npm", ["pack", "--json", "--pack-destination", tarballDir, ...workspaces.flatMap((workspace) => ["--workspace", workspace.name])], repoRoot);
run("npm", ["init", "-y"], appDir);
run("npm", ["install", ...tarballs()], appDir);

writeFileSync(
  join(appDir, "smoke.mjs"),
  `import { createEngine } from "@os-probabilities/core";
import { createLootboxAdapter } from "@os-probabilities/adapters";
import schema from "@os-probabilities/schema/schema.json" with { type: "json" };

const policy = {
  schemaVersion: "os-probabilities/v1",
  sources: { loot: { items: [{ id: "coins", weight: 9 }, { id: "gem", weight: 1 }] } },
  tables: { "lootbox.open": { source: "loot", draw: "weighted_choice" } }
};

const engine = createEngine(policy);
const lootbox = createLootboxAdapter(engine, { tableId: "lootbox.open" });
const result = lootbox.open({}, { playerId: "p1", boxId: "box", openId: "open-1" });

if (schema.$id !== "https://os-probabilities.dev/schemas/os-probabilities-v1.schema.json") {
  throw new Error("schema export did not resolve");
}
if (result.itemIds.length !== 1) {
  throw new Error("lootbox adapter did not return exactly one item");
}
`
);

run("node", ["smoke.mjs"], appDir);
run("npx", ["os-probabilities", "--help"], appDir);

function tarballs() {
  return workspaces.map((workspace) => {
    const file = join(tarballDir, tarballName(workspace));
    if (!existsSync(file)) {
      throw new Error(`expected tarball ${file}`);
    }
    return file;
  });
}

function packageInfo(relativePath) {
  const packageJson = JSON.parse(readFileSync(join(repoRoot, relativePath), "utf8"));
  return {
    name: packageJson.name,
    version: packageJson.version
  };
}

function tarballName(workspace) {
  return workspace.name.replace(/^@/, "").replace("/", "-") + "-" + workspace.version + ".tgz";
}

function run(command, args, cwd) {
  execFileSync(command, args, {
    cwd,
    stdio: "inherit",
    env: {
      ...process.env,
      npm_config_cache: join(tempRoot, "npm-cache")
    }
  });
}
