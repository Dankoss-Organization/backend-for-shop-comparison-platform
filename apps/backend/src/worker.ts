import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { QueueWorkerModule } from "./queue/queue-worker.module";

async function bootstrapWorker() {
  const app = await NestFactory.createApplicationContext(QueueWorkerModule);
  const logger = new Logger("QueueWorker");
  logger.log("Product sync worker is running");

  const shutdown = async (signal: string) => {
    logger.log(`Received ${signal}, closing worker...`);
    await app.close();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

void bootstrapWorker();
