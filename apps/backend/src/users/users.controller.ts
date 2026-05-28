import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
  Body,
  Put,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
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
import { diskStorage } from "multer";
import * as fs from "fs";
import * as path from "path";
import { UpdateMeDto } from "./dto/update-me.dto";
import { UpdatePreferencesDto } from "./dto/update-preferences.dto";

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

  @ApiOperation({ summary: "Remove product from current user favorites" })
  @ApiBearerAuth()
  @ApiOkResponse({
    description: "Product removed from favorites successfully.",
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
  @Delete("me/favorites/:productId")
  removeFromFavorites(
    @Request() req: { user: { id: string } },
    @Param("productId") productId: string,
  ) {
    return this.usersService.removeProductFromFavorites(req.user.id, productId);
  }

  @ApiOperation({ summary: "Get current user profile" })
  @ApiBearerAuth()
  @ApiOkResponse({
    description: "Current user profile returned successfully.",
    schema: {
      type: "object",
      properties: {
        name: { type: "string", example: "Ivan Petrov" },
        email: { type: "string", example: "ivan@example.com" },
        avatarUrl: {
          type: "string",
          example: "https://.../avatar.png",
          nullable: true,
        },
        city: { type: "string", example: "Kyiv", nullable: true },
      },
    },
  })
  @Get("me")
  getMyProfile(@Request() req: { user: { id: string } }) {
    return this.usersService.getMyProfile(req.user.id);
  }

  @ApiOperation({ summary: "Get current user preferences" })
  @ApiBearerAuth()
  @ApiOkResponse({
    description: "Current user preferences returned successfully.",
    schema: {
      type: "object",
      properties: {
        allergies: {
          type: "array",
          items: { type: "string" },
        },
        diet: {
          type: "array",
          items: { type: "string" },
        },
        healthGoals: {
          type: "array",
          items: { type: "string" },
        },
        lifestyle: {
          type: "array",
          items: { type: "string" },
        },
      },
    },
  })
  @Get("me/preferences")
  getMyPreferences(@Request() req: { user: { id: string } }) {
    return this.usersService.getMyPreferences(req.user.id);
  }

  @ApiOperation({ summary: "Update current user preferences" })
  @ApiBearerAuth()
  @ApiOkResponse({
    description: "Current user preferences updated successfully.",
    schema: {
      type: "object",
      properties: {
        allergies: {
          type: "array",
          items: { type: "string" },
        },
        diet: {
          type: "array",
          items: { type: "string" },
        },
        healthGoals: {
          type: "array",
          items: { type: "string" },
        },
        lifestyle: {
          type: "array",
          items: { type: "string" },
        },
      },
    },
  })
  @Put("me/preferences")
  updateMyPreferences(
    @Request() req: { user: { id: string } },
    @Body() body: UpdatePreferencesDto,
  ) {
    return this.usersService.updateMyPreferences(req.user.id, body);
  }

  @ApiOperation({ summary: "Get current user basket history" })
  @ApiBearerAuth()
  @ApiOkResponse({
    description: "List of user's past baskets.",
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          paidTime: { type: "string", format: "date-time", nullable: true },
          items: { type: "array" },
          sum: { type: "number" },
          discountSum: { type: "number" },
        },
      },
    },
  })
  @Get("me/baskets")
  getMyBaskets(@Request() req: { user: { id: string } }) {
    return this.usersService.getMyBaskets(req.user.id);
  }

  @ApiOperation({ summary: "Update current user profile" })
  @ApiBearerAuth()
  @ApiOkResponse({
    description: "Current user profile updated successfully.",
    schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string" },
        avatarUrl: { type: "string", nullable: true },
        city: { type: "string", nullable: true },
      },
    },
  })
  @Put("me")
  updateMyProfile(
    @Request() req: { user: { id: string } },
    @Body() body: UpdateMeDto,
  ) {
    return this.usersService.updateMyProfile(req.user.id, body);
  }

  @ApiOperation({ summary: "Upload avatar for current user" })
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: "Avatar uploaded successfully.",
    schema: {
      type: "object",
      properties: {
        avatarUrl: { type: "string", example: "/uploads/avatars/userid.png" },
      },
    },
  })
  @ApiConsumes("multipart/form-data")
  @Post("me/avatar")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = path.join(process.cwd(), "uploads", "avatars");
          if (!fs.existsSync(uploadPath))
            fs.mkdirSync(uploadPath, { recursive: true });
          cb(null, uploadPath);
        },
        filename: (req: any, file, cb) => {
          const userId = req.user?.id ?? "unknown";
          const ext = path.extname(file.originalname) || ".png";
          cb(null, `${userId}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
          return cb(new Error("Only image files are allowed"), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadAvatar(
    @Request() req: { user: { id: string } },
    @UploadedFile() file: Express.Multer.File,
  ) {
    const relPath = `/uploads/avatars/${file.filename}`;
    return this.usersService.uploadUserAvatar(req.user.id, relPath);
  }
}
