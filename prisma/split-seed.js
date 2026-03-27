const fs = require("fs");
const path = require("path");

const sql = fs.readFileSync(path.join(__dirname, "seed.sql"), "utf8");
const lines = sql.split("\n");

const chunks = [
  { name: "01-setup.sql",                start: 0,    end: 50 },
  { name: "02-edwin-car-racer.sql",      start: 51,   end: 604 },
  { name: "03-edwin-alien-abduction.sql", start: 605,  end: 1227 },
  { name: "04-edwin-fossil-finder.sql",  start: 1228, end: 1753 },
  { name: "05-edwin-storm-witch.sql",    start: 1754, end: 2222 },
  { name: "06-edwin-fly-swatter.sql",    start: 2223, end: 2691 },
  { name: "07-edwin-rhythm-rehab.sql",   start: 2692, end: 3133 },
  { name: "08-giles-car-alien.sql",      start: 3134, end: 3371 },
  { name: "09-giles-fossil-storm.sql",   start: 3372, end: 4022 },
  { name: "10-giles-fly-rhythm.sql",     start: 4023, end: 4454 },
  { name: "11-agatha-car-racer.sql",     start: 4455, end: 5041 },
  { name: "12-agatha-alien-abduction.sql", start: 5042, end: 5721 },
  { name: "13-agatha-fossil-finder.sql", start: 5722, end: 6364 },
  { name: "14-agatha-storm-witch.sql",   start: 6365, end: 6970 },
  { name: "15-agatha-fly-swatter.sql",   start: 6971, end: 7636 },
  { name: "16-agatha-rhythm-rehab.sql",  start: 7637, end: lines.length - 1 },
];

const outDir = path.join(__dirname, "seed-chunks");
// Clear old files
for (const f of fs.readdirSync(outDir)) fs.unlinkSync(path.join(outDir, f));

for (const chunk of chunks) {
  const content = lines.slice(chunk.start, chunk.end + 1).join("\n");
  const outPath = path.join(outDir, chunk.name);
  fs.writeFileSync(outPath, content, "utf8");
  const kb = (Buffer.byteLength(content) / 1024).toFixed(1);
  console.log(`${chunk.name}: ${chunk.end - chunk.start + 1} lines, ${kb} KB`);
}
console.log("\nPaste each file into Supabase SQL Editor in order (01 through 16).");
