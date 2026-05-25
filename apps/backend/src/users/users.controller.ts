import { Controller, Get, Param, Post, Request, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UsersService } from "./users.service";

@ApiTags("users")
@Controller("api/v1/users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: "Get current user favorite product IDs" })
  @ApiBearerAuth()
  @ApiOkResponse({
    description: "Current user favorite product IDs returned successfully.",
    schema: {
      type: "object",
      properties: {
        productIds: {
          type: "array",
          items: {
            type: "string",
          },
          example: ["BAR-005", "KMO-112", "GAL-025"],
        },
      },
    },
  })
  @Get("me/favorites")
  getMyFavorites(@Request() req: { user: { id: string } }) {
    return this.usersService.getMyFavoriteProductIds(req.user.id);
  }

  @ApiOperation({ summary: "Add product to current user favorites" })
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: "Product added to favorites successfully.",
    schema: {
      type: "object",
      properties: {
        success: {
          type: "boolean",
          example: true,
        },
        productId: {
          type: "string",
          example: "BAR-005",
        },
      },
    },
  })
  @ApiNotFoundResponse({ description: "Product was not found." })
  @Post("me/favorites/:productId")
  addToFavorites(
    @Request() req: { user: { id: string } },
    @Param("productId") productId: string,
  ) {
    return this.usersService.addProductToFavorites(req.user.id, productId);
  }
}
