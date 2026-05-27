import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { ApiDocumentationService } from "../shared/api-documentation.service";

async function generateApiDocs() {
  const app = await NestFactory.create(AppModule, { logger: false });

  ApiDocumentationService.configure(app);
  const openApiDocument = ApiDocumentationService.createDocument(app);

  const docsApiDir = join(process.cwd(), "docs", "api");
  mkdirSync(docsApiDir, { recursive: true });

  writeFileSync(
    join(docsApiDir, "openapi.json"),
    JSON.stringify(openApiDocument, null, 2),
    "utf8",
  );

  const openApiJson = JSON.stringify(openApiDocument)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");

  writeFileSync(
    join(docsApiDir, "index.html"),
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Shop Comparison Platform API Docs</title>
    <style>
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; color: #0f172a; background: #f8fafc; }
      .container { max-width: 1040px; margin: 0 auto; padding: 44px 20px 56px; }
      .topbar { margin-bottom: 20px; }
      .topbar a { color: #1d4ed8; text-decoration: none; font-weight: 600; }
      .topbar a:hover { text-decoration: underline; }
      h1 { margin: 0; font-size: clamp(30px, 4vw, 44px); }
      .subtitle { margin-top: 10px; color: #334155; line-height: 1.6; font-size: 17px; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-top: 24px; }
      .card { display: block; padding: 20px; border: 1px solid #cbd5e1; border-radius: 16px; background: #fff; color: inherit; text-decoration: none; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04); transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease; }
      .card:hover { transform: translateY(-1px); border-color: #93c5fd; box-shadow: 0 10px 24px rgba(29, 78, 216, 0.08); }
      .badge { display: inline-block; margin-bottom: 10px; padding: 4px 10px; border-radius: 999px; background: #dbeafe; color: #1d4ed8; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; }
      .card h2 { margin: 0; font-size: 20px; }
      .card p { margin: 8px 0 0; color: #475569; line-height: 1.6; }
      .note { margin-top: 20px; padding: 14px 16px; border-left: 4px solid #1d4ed8; background: #eff6ff; color: #1e3a8a; border-radius: 10px; }
    </style>
  </head>
  <body>
    <main class="container">
      <div class="topbar">API docs · <a href="../">Back to docs home</a></div>
      <h1>Shop Comparison Platform API</h1>
      <p class="subtitle">Browser-friendly endpoint guides with concrete request and response examples. Start from the group pages below, then open <a href="./openapi.json">openapi.json</a> for the raw schema snapshot.</p>

      <div class="grid">
        <a class="card" href="./authentication.html"><span class="badge">Auth</span><h2>Authentication</h2><p>Token verification, current user lookup, and logout.</p></a>
        <a class="card" href="./products.html"><span class="badge">Catalog</span><h2>Products</h2><p>Catalog listing, cards, offers, price history, jobs, and related products.</p></a>
        <a class="card" href="./search.html"><span class="badge">Search</span><h2>Search</h2><p>Meilisearch queries, facets, health, stats, and task status.</p></a>
        <a class="card" href="./cart-optimization.html"><span class="badge">Optimization</span><h2>Cart Optimization</h2><p>Scenario comparison for cheapest, closest, and optimal fulfillment.</p></a>
        <a class="card" href="./categories.html"><span class="badge">Browse</span><h2>Categories</h2><p>Category tree, category metadata, category products, and facets.</p></a>
        <a class="card" href="./stores.html"><span class="badge">Browse</span><h2>Stores</h2><p>Store listing and store-scoped product browsing.</p></a>
        <a class="card" href="./carts.html"><span class="badge">Private</span><h2>Carts</h2><p>Read and mutate the active authenticated cart.</p></a>
        <a class="card" href="./users.html"><span class="badge">Private</span><h2>Users</h2><p>Favorites list and add/remove favorite products.</p></a>
        <a class="card" href="./recipes.html"><span class="badge">Recipes</span><h2>Recipes</h2><p>Recipe listing, details, categories, and related recipes.</p></a>
        <a class="card" href="./jobs.html"><span class="badge">Ops</span><h2>Jobs / Queue</h2><p>Background job status pages for sync and analytics processing.</p></a>
        <a class="card" href="./admin.html"><span class="badge">Internal</span><h2>Admin / Internal</h2><p>Current status of admin-facing operational endpoints.</p></a>
      </div>

      <div class="note">Each group page includes a short description plus request and response examples for every endpoint listed there.</div>
    </main>
  </body>
</html>
`,
    "utf8",
  );

  await app.close();
}

generateApiDocs().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error("Failed to generate API docs", error);
  process.exit(1);
});
