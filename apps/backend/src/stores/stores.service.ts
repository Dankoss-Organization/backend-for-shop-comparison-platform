import {
  Injectable,
  Inject,
  InternalServerErrorException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { GetStoresResponseDto, StoreDto } from "./dto/get-stores-response.dto";

@Injectable()
export class StoresService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {}

  async getStores(): Promise<GetStoresResponseDto> {
    try {
      this.logger.info("Fetching stores", {
        service: "StoresService",
        method: "getStores",
      });

      const brands = await this.prisma.storeBrand.findMany({
        include: {
          _count: {
            select: { localStores: true },
          },
        },
        orderBy: {
          name: "asc",
        },
      });

      const stores: StoreDto[] = brands.map((brand) => ({
        id: brand.id,
        brand: brand.name,
        logo: brand.logo ?? null,
        website: brand.website ?? null,
        locationCount: brand._count.localStores,
      }));

      this.logger.info("Stores fetched successfully", {
        service: "StoresService",
        method: "getStores",
        count: stores.length,
      });

      return { stores };
    } catch (error) {
      this.logger.error("Failed to fetch stores", {
        service: "StoresService",
        method: "getStores",
        error: error instanceof Error ? error.message : String(error),
      });

      throw new InternalServerErrorException("Failed to fetch stores");
    }
  }
}
