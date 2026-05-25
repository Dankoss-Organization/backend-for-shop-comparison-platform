import { Injectable, NotFoundException } from "@nestjs/common";
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

type RecipeCategoryTreeNode = {
  id: string;
  name: string;
  parentId: string | null;
  recipeCount: number;
  children: RecipeCategoryTreeNode[];
};

@Injectable()
export class RecipesService {
  constructor(private readonly prisma: PrismaService) {}

  async getRelatedRecipes(id: string, limit: number) {
    const cappedLimit = Math.max(1, Math.min(limit, 20));
    const sourceRecipe = await this.prisma.recipe.findUnique({
      where: { id },
      select: {
        id: true,
        categoryId: true,
        difficulty: true,
        prepTime: true,
      },
    });

    if (!sourceRecipe) {
      throw new NotFoundException(`Recipe '${id}' not found`);
    }

    const candidates = await this.prisma.recipe.findMany({
      where: {
        id: {
          not: sourceRecipe.id,
        },
        OR: [
          {
            categoryId: sourceRecipe.categoryId,
          },
          {
            difficulty: {
              equals: sourceRecipe.difficulty,
              mode: "insensitive",
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        difficulty: true,
        prepTime: true,
        categoryId: true,
      },
      take: Math.max(cappedLimit * 4, 20),
      orderBy: [{ prepTime: "asc" }, { name: "asc" }],
    });

    if (candidates.length === 0) {
      return {
        recipeId: sourceRecipe.id,
        related: [],
      };
    }

    const ratings = await this.prisma.review.groupBy({
      by: ["recipeId"],
      where: {
        recipeId: {
          in: candidates.map((candidate) => candidate.id),
        },
      },
      _avg: {
        rate: true,
      },
    });

    const ratingByRecipeId = new Map(
      ratings.map((item) => [item.recipeId, item._avg.rate ?? 0]),
    );

    const scored = candidates
      .map((candidate) => {
        let score = 0;

        if (candidate.categoryId === sourceRecipe.categoryId) {
          score += 100;
        }

        if (
          candidate.difficulty.toLowerCase() ===
          sourceRecipe.difficulty.toLowerCase()
        ) {
          score += 30;
        }

        const prepDelta = Math.abs(candidate.prepTime - sourceRecipe.prepTime);
        score += Math.max(0, 20 - prepDelta);

        const avgRating = ratingByRecipeId.get(candidate.id) ?? 0;

        return {
          id: candidate.id,
          name: candidate.name,
          imageUrl: candidate.imageUrl,
          difficulty: candidate.difficulty,
          prepTime: candidate.prepTime,
          avgRating: Number(avgRating.toFixed(1)),
          score,
        };
      })
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        if (right.avgRating !== left.avgRating) {
          return right.avgRating - left.avgRating;
        }

        return left.name.localeCompare(right.name);
      })
      .slice(0, cappedLimit)
      .map(({ score, ...item }) => item);

    return {
      recipeId: sourceRecipe.id,
      related: scored,
    };
  }

  async getRecipeCategories(parentId?: string) {
    const [categories, recipeCounts] = await this.prisma.$transaction([
      this.prisma.recipeCategory.findMany({
        orderBy: {
          name: "asc",
        },
      }),
      this.prisma.recipe.groupBy({
        by: ["categoryId"],
        _count: {
          _all: true,
        },
      }),
    ]);

    const countsByCategoryId = new Map<string, number>();
    for (const row of recipeCounts) {
      countsByCategoryId.set(row.categoryId, row._count._all);
    }

    const nodesById = new Map<string, RecipeCategoryTreeNode>();
    for (const category of categories) {
      nodesById.set(category.id, {
        id: category.id,
        name: category.name,
        parentId: category.parentId,
        recipeCount: countsByCategoryId.get(category.id) ?? 0,
        children: [],
      });
    }

    for (const category of categories) {
      if (!category.parentId) {
        continue;
      }

      const parent = nodesById.get(category.parentId);
      const child = nodesById.get(category.id);
      if (parent && child) {
        parent.children.push(child);
      }
    }

    if (parentId) {
      const selectedRoot = nodesById.get(parentId);
      if (!selectedRoot) {
        throw new NotFoundException(`Category '${parentId}' not found`);
      }

      return {
        categories: [this.sortRecipeCategoryTree(selectedRoot)],
      };
    }

    const roots = categories
      .filter((category) => category.parentId === null)
      .map((category) => nodesById.get(category.id))
      .filter(Boolean) as RecipeCategoryTreeNode[];

    return {
      categories: roots.map((node) => this.sortRecipeCategoryTree(node)),
    };
  }

  async getRecipeById(id: string) {
    const [recipe, ratingStats] = await this.prisma.$transaction([
      this.prisma.recipe.findUnique({
        where: { id },
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          ingredients: {
            include: {
              ingredient: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true,
                },
              },
            },
            orderBy: {
              id: "asc",
            },
          },
          equipment: {
            include: {
              equipment: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: {
              id: "asc",
            },
          },
          reviews: {
            orderBy: {
              createdAt: "desc",
            },
            take: 10,
            select: {
              id: true,
              rate: true,
              comment: true,
              createdAt: true,
            },
          },
        },
      }),
      this.prisma.review.aggregate({
        where: {
          recipeId: id,
        },
        _avg: {
          rate: true,
        },
        _count: {
          _all: true,
        },
      }),
    ]);

    if (!recipe) {
      throw new NotFoundException(`Recipe '${id}' not found`);
    }

    return {
      id: recipe.id,
      name: recipe.name,
      imageUrl: recipe.imageUrl,
      instructions: recipe.instructions,
      difficulty: recipe.difficulty,
      prepTime: recipe.prepTime,
      servings: recipe.servings,
      category: {
        id: recipe.category.id,
        name: recipe.category.name,
      },
      ingredients: recipe.ingredients.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        unit: item.unit,
        ingredient: {
          id: item.ingredient.id,
          name: item.ingredient.name,
          imageUrl: item.ingredient.imageUrl,
        },
      })),
      equipment: recipe.equipment.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        equipment: {
          id: item.equipment.id,
          name: item.equipment.name,
        },
      })),
      reviews: recipe.reviews.map((review) => ({
        id: review.id,
        rate: review.rate,
        comment: review.comment,
        createdAt: review.createdAt.toISOString(),
      })),
      avgRating: Number((ratingStats._avg.rate ?? 0).toFixed(1)),
      reviewCount: ratingStats._count._all,
    };
  }

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

  private sortRecipeCategoryTree(
    node: RecipeCategoryTreeNode,
  ): RecipeCategoryTreeNode {
    return {
      ...node,
      children: node.children
        .map((child) => this.sortRecipeCategoryTree(child))
        .sort((left, right) => left.name.localeCompare(right.name)),
    };
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