import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MeilisearchService } from "./meilisearch.service";
import { SearchController } from "./search.controller";

@Module({
  imports: [ConfigModule],
  providers: [MeilisearchService],
  controllers: [SearchController],
  exports: [MeilisearchService],
})
export class MeilisearchModule {}
