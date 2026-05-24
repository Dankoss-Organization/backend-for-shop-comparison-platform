import { NestFactory } from "@nestjs/core";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import { QueueWorkerModule } from "./queue/queue-worker.module";

async function bootstrapWorker() {
  const app = await NestFactory.createApplicationContext(QueueWorkerModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);

  logger.log("Product sync worker is running", "QueueWorker");

  const shutdown = async (signal: string) => {
    logger.log(`Received ${signal}, closing worker...`, "QueueWorker");
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
