import { readFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import windowsVerifier from "./verify-windows.cjs";
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
if (result.status === 0 && platform === "win") {
  windowsVerifier({
    electronPlatformName: "win32",
    appOutDir: `${output}/win-unpacked`,
  });
  windowsVerifier.verifyExecutable(
    `${output}/ARENA-Manager-${pkg.version}-Windows.exe`,
  );
}
process.exit(result.status ?? 1);
