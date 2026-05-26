import * as fs from "fs";
import * as path from "path";

const resultsPath = path.resolve(process.cwd(), "bench-results.json");
const outPath = path.resolve(process.cwd(), "result.txt");

if (!fs.existsSync(resultsPath)) {
  console.error("bench-results.json not found in project root.");
  process.exit(1);
}

const raw = fs.readFileSync(resultsPath, { encoding: "utf8" });
const data = JSON.parse(raw) as any[];

const lines: string[] = [];
lines.push("=== Worker Threads Benchmark ===");
lines.push(
  "index | pool | dataSize | iterations | tasks | workerMs | syncMs | workerOpsSec | syncOpsSec | speedup",
);

for (let i = 0; i < data.length; i++) {
  const s = data[i];
  const row = [
    i,
    s.scenario.poolSize,
    s.scenario.dataSize,
    s.scenario.iterations,
    s.scenario.tasks,
    Number(s.workerThreads.totalMs).toFixed(2),
    Number(s.sync.totalMs).toFixed(2),
    Number(s.workerThreads.opsPerSec).toFixed(2),
    Number(s.sync.opsPerSec).toFixed(2),
    Number(s.speedupVsSync).toFixed(2),
  ].join(" | ");
  lines.push(row);
}

lines.push("");
lines.push("Detailed results (JSON):");
lines.push(raw);

fs.writeFileSync(outPath, lines.join("\n"), { encoding: "utf8" });
console.log(`Wrote cleaned results to ${outPath}`);
