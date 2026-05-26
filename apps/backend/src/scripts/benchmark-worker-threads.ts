import { WorkerThreadsService } from "../queue/worker-threads.service";
import * as fs from "fs";
import * as path from "path";

type Scenario = {
  poolSize: number;
  dataSize: number;
  iterations: number;
  tasks: number;
};

type RunMetrics = {
  mode: "worker_threads" | "sync";
  totalMs: number;
  opsPerSec: number;
  avgTaskCpuMs: number;
};

type ScenarioResult = {
  scenario: Scenario;
  workerThreads: RunMetrics;
  sync: RunMetrics;
  speedupVsSync: number;
};

function parseNumberList(value: string | undefined, fallback: number[]): number[] {
  if (!value?.trim()) {
    return fallback;
  }

  const parsed = value
    .split(",")
    .map((entry) => Number(entry.trim()))
    .filter((entry) => Number.isFinite(entry) && entry > 0)
    .map((entry) => Math.floor(entry));

  return parsed.length > 0 ? parsed : fallback;
}

function buildPrices(size: number): number[] {
  // Deterministic dataset generation keeps runs reproducible.
  return Array.from({ length: size }, (_, index) => {
    const base = 20 + (index % 97);
    const oscillation = ((index * 37) % 23) * 0.17;
    return Number((base + oscillation).toFixed(2));
  });
}

function measureWithHrTime(execute: () => Promise<void>): Promise<number> {
  const start = process.hrtime.bigint();

  return execute().then(() => {
    const elapsedNs = process.hrtime.bigint() - start;
    return Number(elapsedNs) / 1_000_000;
  });
}

async function runWorkerThreadsScenario(
  service: WorkerThreadsService,
  scenario: Scenario,
): Promise<RunMetrics> {
  const input = {
    prices: buildPrices(scenario.dataSize),
    iterations: scenario.iterations,
  };

  const taskDurations: number[] = [];
  const totalMs = await measureWithHrTime(async () => {
    const results = await Promise.all(
      Array.from({ length: scenario.tasks }, () => service.runPriceSignalTask(input)),
    );

    for (const result of results) {
      taskDurations.push(result.durationMs);
    }
  });

  const avgTaskCpuMs =
    taskDurations.reduce((sum, duration) => sum + duration, 0) / Math.max(1, taskDurations.length);

  return {
    mode: "worker_threads",
    totalMs,
    opsPerSec: (scenario.tasks / totalMs) * 1000,
    avgTaskCpuMs,
  };
}

async function runSyncScenario(service: WorkerThreadsService, scenario: Scenario): Promise<RunMetrics> {
  const input = {
    prices: buildPrices(scenario.dataSize),
    iterations: scenario.iterations,
  };

  const taskDurations: number[] = [];
  const totalMs = await measureWithHrTime(async () => {
    for (let i = 0; i < scenario.tasks; i++) {
      const result = service.runPriceSignalTaskSyncFallback(input);
      taskDurations.push(result.durationMs);
    }
  });

  const avgTaskCpuMs =
    taskDurations.reduce((sum, duration) => sum + duration, 0) / Math.max(1, taskDurations.length);

  return {
    mode: "sync",
    totalMs,
    opsPerSec: (scenario.tasks / totalMs) * 1000,
    avgTaskCpuMs,
  };
}

function printResults(results: ScenarioResult[]) {
  const rows = results.map((result) => ({
    pool: result.scenario.poolSize,
    dataSize: result.scenario.dataSize,
    iterations: result.scenario.iterations,
    tasks: result.scenario.tasks,
    workerMs: Number(result.workerThreads.totalMs.toFixed(2)),
    syncMs: Number(result.sync.totalMs.toFixed(2)),
    workerOpsSec: Number(result.workerThreads.opsPerSec.toFixed(2)),
    syncOpsSec: Number(result.sync.opsPerSec.toFixed(2)),
    speedup: Number(result.speedupVsSync.toFixed(2)),
  }));

  console.log("\n=== Worker Threads Benchmark ===");
  console.table(rows);

  console.log("\nDetailed results (JSON):");
  console.log(JSON.stringify(results, null, 2));

  const outputFormat = (process.env.BENCH_OUTPUT ?? "").toLowerCase();
  const outputPath = process.env.BENCH_OUTPUT_PATH ?? "bench-results.json";

  try {
    if (outputFormat === "json") {
      fs.writeFileSync(path.resolve(outputPath), JSON.stringify(results, null, 2), { encoding: "utf8" });
      console.log(`Wrote JSON results to ${outputPath}`);
    } else if (outputFormat === "csv") {
      const header = Object.keys(rows[0] ?? {}).join(",");
      const csvLines = [header];
      for (const r of rows) {
        csvLines.push(
          [
            r.pool,
            r.dataSize,
            r.iterations,
            r.tasks,
            r.workerMs,
            r.syncMs,
            r.workerOpsSec,
            r.syncOpsSec,
            r.speedup,
          ].join(","),
        );
      }
      fs.writeFileSync(path.resolve(outputPath), csvLines.join("\n"), { encoding: "utf8" });
      console.log(`Wrote CSV results to ${outputPath}`);
    }
  } catch (err) {
    console.warn("Failed to write output file:", err instanceof Error ? err.message : String(err));
  }
}

async function run() {
  const poolSizes = parseNumberList(process.env.BENCH_POOL_SIZES, [1, 2, 4]);
  const dataSizes = parseNumberList(process.env.BENCH_DATA_SIZES, [16, 128, 512]);
  const iterationsList = parseNumberList(process.env.BENCH_ITERATIONS, [5000, 20000]);
  const taskCounts = parseNumberList(process.env.BENCH_TASK_COUNTS, [1, 4, 16]);

  const scenarios: Scenario[] = [];
  for (const poolSize of poolSizes) {
    for (const dataSize of dataSizes) {
      for (const iterations of iterationsList) {
        for (const tasks of taskCounts) {
          scenarios.push({ poolSize, dataSize, iterations, tasks });
        }
      }
    }
  }

  const results: ScenarioResult[] = [];

  for (const scenario of scenarios) {
    process.env.WORKER_THREAD_POOL_SIZE = String(scenario.poolSize);
    const service = new WorkerThreadsService();

    try {
      // Warm-up run to reduce startup bias for each pool size scenario.
      await service.runPriceSignalTask({
        prices: buildPrices(Math.min(scenario.dataSize, 32)),
        iterations: Math.max(1000, Math.floor(scenario.iterations / 5)),
      });

      const workerThreads = await runWorkerThreadsScenario(service, scenario);
      const sync = await runSyncScenario(service, scenario);

      results.push({
        scenario,
        workerThreads,
        sync,
        speedupVsSync: sync.totalMs / workerThreads.totalMs,
      });
    } finally {
      await service.onModuleDestroy();
    }
  }

  printResults(results);
}

void run().catch((error) => {
  console.error("Benchmark failed:", error);
  process.exit(1);
});
