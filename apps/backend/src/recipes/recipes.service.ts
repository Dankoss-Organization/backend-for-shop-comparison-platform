import { Injectable } from "@nestjs/common";
import { Prisma, Recipe } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

type RecipeDifficulty = "easy" | "medium" | "hard";
type RecipesSort = "rating" | "newest" | "prepTime";

type RecipeListItem = {
  id: string;
  name: string;
  imageUrl: string | null;
  difficulty: string;
  prepTime: number;
  servings: number;
  categoryId: string;
  avgRating: number;
  reviewCount: number;
};

type RecipeRatingRow = {
  id: string;
  name: string;
  imageUrl: string | null;
  difficulty: string;
  prepTime: number;
  servings: number;
  categoryId: string;
  avgRating: number;
  reviewCount: number;
};

@Injectable()
export class RecipesService {
  constructor(private readonly prisma: PrismaService) {}

  async getRecipes(options: {
    page: number;
    limit: number;
    search?: string;
    categoryId?: string;
    difficulty?: RecipeDifficulty;
    sort: RecipesSort;
  }) {
    const where: Prisma.RecipeWhereInput = {
      ...(options.search
        ? {
            name: {
              contains: options.search,
              mode: "insensitive",
            },
          }
        : {}),
      ...(options.categoryId ? { categoryId: options.categoryId } : {}),
      ...(options.difficulty
        ? {
            difficulty: {
              equals: options.difficulty,
              mode: "insensitive",
            },
          }
        : {}),
    };

    const total = await this.prisma.recipe.count({ where });
    if (total === 0) {
      return {
        items: [],
        total: 0,
        page: options.page,
        limit: options.limit,
        totalPages: 1,
      };
    }

    let items: RecipeListItem[];
    if (options.sort === "rating") {
      items = await this.getRecipesSortedByRating(where, options.page, options.limit);
    } else {
      items = await this.getRecipesSortedByFields(where, options.page, options.limit, options.sort);
    }

    return {
      items,
      total,
      page: options.page,
      limit: options.limit,
      totalPages: Math.max(1, Math.ceil(total / options.limit)),
    };
  }

  private async getRecipesSortedByFields(
    where: Prisma.RecipeWhereInput,
    page: number,
    limit: number,
    sort: Extract<RecipesSort, "newest" | "prepTime">,
  ) {
    const orderBy: Prisma.RecipeOrderByWithRelationInput[] =
      sort === "prepTime"
        ? [{ prepTime: "asc" }, { name: "asc" }]
        : [{ id: "desc" }];

    const recipes = await this.prisma.recipe.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        imageUrl: true,
        difficulty: true,
        prepTime: true,
        servings: true,
        categoryId: true,
      },
    });

    return this.attachRatingStats(recipes);
  }

  private async getRecipesSortedByRating(
    where: Prisma.RecipeWhereInput,
    page: number,
    limit: number,
  ) {
    const whereSql = this.buildRawWhereClause(where);

    const rows = await this.prisma.$queryRaw<RecipeRatingRow[]>(Prisma.sql`
      SELECT
        r.id,
        r.name,
        r.image_url AS "imageUrl",
        r.difficulty,
        r."prepTime" AS "prepTime",
        r.servings,
        r."categoryId" AS "categoryId",
        COALESCE(AVG(rv.rate)::float8, 0)::float8 AS "avgRating",
        COUNT(rv.id)::int AS "reviewCount"
      FROM recipes r
      LEFT JOIN reviews rv ON rv."recipeId" = r.id
      ${whereSql}
      GROUP BY r.id, r.name, r.image_url, r.difficulty, r."prepTime", r.servings, r."categoryId"
      ORDER BY "avgRating" DESC, "reviewCount" DESC, r.name ASC
      LIMIT ${limit}
      OFFSET ${(page - 1) * limit}
    `);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      imageUrl: row.imageUrl,
      difficulty: row.difficulty,
      prepTime: row.prepTime,
      servings: row.servings,
      categoryId: row.categoryId,
      avgRating: Number(row.avgRating.toFixed(1)),
      reviewCount: row.reviewCount,
    }));
  }

  private async attachRatingStats(recipes: Array<
    Pick<Recipe, "id" | "name" | "imageUrl" | "difficulty" | "prepTime" | "servings" | "categoryId">
  >) {
    if (recipes.length === 0) {
      return [];
    }

    const stats = await this.prisma.review.groupBy({
      by: ["recipeId"],
      where: {
        recipeId: {
          in: recipes.map((recipe) => recipe.id),
        },
      },
      _avg: {
        rate: true,
      },
      _count: {
        _all: true,
      },
    });

    const statsByRecipeId = new Map(
      stats.map((item) => [
        item.recipeId,
        {
          avgRating: item._avg.rate ?? 0,
          reviewCount: item._count._all,
        },
      ]),
    );

    return recipes.map((recipe) => {
      const recipeStats = statsByRecipeId.get(recipe.id);

      return {
        id: recipe.id,
        name: recipe.name,
        imageUrl: recipe.imageUrl,
        difficulty: recipe.difficulty,
        prepTime: recipe.prepTime,
        servings: recipe.servings,
        categoryId: recipe.categoryId,
        avgRating: Number((recipeStats?.avgRating ?? 0).toFixed(1)),
        reviewCount: recipeStats?.reviewCount ?? 0,
      };
    });
  }

  private buildRawWhereClause(where: Prisma.RecipeWhereInput) {
    const clauses: Prisma.Sql[] = [];

    if (where.categoryId && typeof where.categoryId === "string") {
      clauses.push(Prisma.sql`r."categoryId" = ${where.categoryId}`);
    }

    if (where.difficulty && typeof where.difficulty === "object" && "equals" in where.difficulty) {
      const difficulty = where.difficulty.equals;
      if (typeof difficulty === "string") {
        clauses.push(Prisma.sql`LOWER(r.difficulty) = LOWER(${difficulty})`);
      }
    }

    if (where.name && typeof where.name === "object" && "contains" in where.name) {
      const search = where.name.contains;
      if (typeof search === "string") {
        clauses.push(Prisma.sql`r.name ILIKE ${`%${search}%`}`);
      }
    }

    if (clauses.length === 0) {
      return Prisma.empty;
    }

    return Prisma.sql`WHERE ${Prisma.join(clauses, " AND ")}`;
  }
}