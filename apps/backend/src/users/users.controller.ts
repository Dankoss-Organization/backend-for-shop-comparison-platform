import { Controller, Get, Request, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
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
}
