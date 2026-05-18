import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MeilisearchService } from "./meilisearch.service";

@Module({
  imports: [ConfigModule],
  providers: [MeilisearchService],
  exports: [MeilisearchService],
})
export class MeilisearchModule {}
