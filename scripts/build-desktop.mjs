import { readFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const platform = process.argv[2];
if (!["win", "linux"].includes(platform)) throw Error("Choose win or linux");
const output = `release/v${pkg.version}`;
rmSync(output, { recursive: true, force: true });
const result = spawnSync(
  process.execPath,
  [
    path.resolve("node_modules/electron-builder/cli.js"),
    `--${platform}`,
    platform === "win" ? "portable" : "AppImage",
    "--x64",
    `--config.directories.output=${output}`,
  ],
  { stdio: "inherit" },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
