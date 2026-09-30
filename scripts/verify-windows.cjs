const fs = require("node:fs");
const path = require("node:path");

function verifyExecutable(file) {
  const size = fs.statSync(file).size;
  const fd = fs.openSync(file, "r");
  try {
    const header = Buffer.alloc(4096);
    fs.readSync(fd, header, 0, header.length, 0);
    const pe = header.readUInt32LE(60);
    if (
      header.toString("ascii", 0, 2) !== "MZ" ||
      pe + 24 > header.length ||
      header.toString("ascii", pe, pe + 4) !== "PE\0\0"
    )
      throw Error(`Invalid Windows executable: ${file}`);
    const count = header.readUInt16LE(pe + 6);
    const offset = pe + 24 + header.readUInt16LE(pe + 20);
    if (!count || count > 96 || offset + count * 40 > size)
      throw Error(`Invalid PE sections: ${file}`);
    const sections = Buffer.alloc(count * 40);
    fs.readSync(fd, sections, 0, sections.length, offset);
    for (let i = 0; i < count; i++) {
      const at = i * 40,
        bytes = sections.readUInt32LE(at + 16),
        start = sections.readUInt32LE(at + 20);
      if (bytes && (start === 0 || start + bytes > size))
        throw Error(
          `Truncated Windows executable: ${file} (section ${i}, needs ${start + bytes}, has ${size})`,
        );
    }
    return size;
  } finally {
    fs.closeSync(fd);
  }
}
module.exports = (context) => {
  if (context.electronPlatformName !== "win32") return;
  for (const file of fs
    .readdirSync(context.appOutDir)
    .filter((f) => /\.(exe|dll)$/i.test(f)))
    verifyExecutable(path.join(context.appOutDir, file));
  console.log("Windows executable sections verified.");
};
module.exports.verifyExecutable = verifyExecutable;
