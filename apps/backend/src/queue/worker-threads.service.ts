import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Worker } from "node:worker_threads";

export interface PriceSignalInput {
  prices: number[];
  iterations: number;
}

export interface PriceSignalOutput {
  checksum: number;
  durationMs: number;
  threadId: number;
}

interface PoolTask {
  taskId: number;
  input: PriceSignalInput;
  resolve: (value: PriceSignalOutput) => void;
  reject: (reason?: unknown) => void;
}

interface PoolWorker {
  worker: Worker;
  busy: boolean;
  currentTaskId: number | null;
}

const inlineWorkerScript = `
const { parentPort, threadId } = require("node:worker_threads");

function computePriceSignal(data) {
  const start = Date.now();
  const prices = Array.isArray(data.prices) ? data.prices : [];
  const iterations = Number.isFinite(data.iterations) ? data.iterations : 20000;

  let checksum = 0;
  for (let i = 0; i < iterations; i++) {
    for (let j = 0; j < prices.length; j++) {
      const price = prices[j];
      checksum = (checksum + Math.sqrt(price + i + j) * 2654435761) % 1000000007;
    }
  }

  return {
    checksum: Number(checksum.toFixed(2)),
    durationMs: Date.now() - start,
    threadId,
  };
}

parentPort.on("message", (payload) => {
  try {
    const result = computePriceSignal(payload.input);
    parentPort.postMessage({ taskId: payload.taskId, result });
  } catch (error) {
    parentPort.postMessage({
      taskId: payload.taskId,
      error: error instanceof Error ? error.message : "Worker task failed",
    });
  }
});
`;

@Injectable()
export class WorkerThreadsService implements OnModuleDestroy {
  private readonly poolSize = this.getPoolSize();
  private readonly pool: PoolWorker[] = [];
  private readonly taskQueue: PoolTask[] = [];
  private readonly pendingTasks = new Map<number, PoolTask>();
  private nextTaskId = 1;
  private initialized = false;

  async onModuleDestroy() {
    await Promise.all(this.pool.map((entry) => entry.worker.terminate()));
    this.pool.length = 0;
    this.taskQueue.length = 0;
    this.pendingTasks.clear();
  }

  async runPriceSignalTask(input: PriceSignalInput): Promise<PriceSignalOutput> {
    this.ensurePoolInitialized();

    return new Promise((resolve, reject) => {
      const task: PoolTask = {
        taskId: this.nextTaskId++,
        input,
        resolve,
        reject,
      };

      const worker = this.getIdleWorker();
      if (!worker) {
        this.taskQueue.push(task);
        return;
      }

      this.dispatchTask(worker, task);
    });
  }

  runPriceSignalTaskSyncFallback(input: PriceSignalInput): Omit<PriceSignalOutput, "threadId"> {
    const start = Date.now();
    let checksum = 0;

    for (let i = 0; i < input.iterations; i++) {
      for (let j = 0; j < input.prices.length; j++) {
        const price = input.prices[j];
        checksum = (checksum + Math.sqrt(price + i + j) * 2654435761) % 1000000007;
      }
    }

    return {
      checksum: Number(checksum.toFixed(2)),
      durationMs: Date.now() - start,
    };
  }

  private dispatchTask(poolWorker: PoolWorker, task: PoolTask) {
    poolWorker.busy = true;
    poolWorker.currentTaskId = task.taskId;
    this.pendingTasks.set(task.taskId, task);
    poolWorker.worker.postMessage({
      taskId: task.taskId,
      input: task.input,
    });
  }

  private getIdleWorker() {
    return this.pool.find((entry) => !entry.busy);
  }

  private ensurePoolInitialized() {
    if (this.initialized) {
      return;
    }

    for (let i = 0; i < this.poolSize; i++) {
      const worker = new Worker(inlineWorkerScript, {
        eval: true,
      });
      const poolWorker: PoolWorker = {
        worker,
        busy: false,
        currentTaskId: null,
      };

      worker.on("message", (message: { taskId: number; result?: PriceSignalOutput; error?: string }) => {
        const task = this.pendingTasks.get(message.taskId);
        if (!task) {
          return;
        }

        this.pendingTasks.delete(message.taskId);
        poolWorker.busy = false;
        poolWorker.currentTaskId = null;

        if (message.error) {
          task.reject(new Error(message.error));
        } else if (message.result) {
          task.resolve(message.result);
        } else {
          task.reject(new Error("Worker returned empty result"));
        }

        this.flushQueuedTasks();
      });

      worker.on("error", (error) => {
        if (poolWorker.currentTaskId !== null) {
          const task = this.pendingTasks.get(poolWorker.currentTaskId);
          if (task) {
            task.reject(error);
            this.pendingTasks.delete(poolWorker.currentTaskId);
          }
        }

        poolWorker.busy = false;
        poolWorker.currentTaskId = null;
      });

      worker.on("exit", (code) => {
        if (code !== 0) {
          if (poolWorker.currentTaskId !== null) {
            const task = this.pendingTasks.get(poolWorker.currentTaskId);
            if (task) {
              task.reject(new Error(`Worker thread exited with code ${code}`));
              this.pendingTasks.delete(poolWorker.currentTaskId);
            }
          }

          poolWorker.busy = false;
          poolWorker.currentTaskId = null;
        }
      });

      this.pool.push(poolWorker);
    }

    this.initialized = true;
  }

  private flushQueuedTasks() {
    while (this.taskQueue.length > 0) {
      const idleWorker = this.getIdleWorker();
      if (!idleWorker) {
        break;
      }

      const nextTask = this.taskQueue.shift();
      if (!nextTask) {
        break;
      }

      this.dispatchTask(idleWorker, nextTask);
    }
  }

  private getPoolSize() {
    const parsedPoolSize = Number(process.env.WORKER_THREAD_POOL_SIZE ?? 2);
    if (!Number.isFinite(parsedPoolSize)) {
      return 2;
    }

    return Math.max(1, Math.min(16, Math.floor(parsedPoolSize)));
  }
}
