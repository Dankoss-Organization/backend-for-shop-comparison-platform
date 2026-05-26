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
      body { margin: 0; font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; }
      .topbar {
        padding: 12px 16px;
        background: #0f172a;
        color: #f8fafc;
        font-size: 14px;
      }
      .topbar a { color: #93c5fd; text-decoration: none; }
      .status {
        margin: 16px;
        padding: 14px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        background: #f8fafc;
        color: #0f172a;
      }
      .status a { color: #1d4ed8; }
      .basic-docs {
        margin: 16px;
        padding: 16px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        background: #ffffff;
      }
      .endpoint {
        margin-top: 14px;
        padding-top: 14px;
        border-top: 1px solid #e2e8f0;
      }
      .endpoint:first-child {
        margin-top: 0;
        padding-top: 0;
        border-top: 0;
      }
      .method {
        display: inline-block;
        min-width: 64px;
        text-align: center;
        font-weight: 700;
        color: #fff;
        background: #1d4ed8;
        border-radius: 6px;
        padding: 2px 8px;
        margin-right: 8px;
        text-transform: uppercase;
      }
      .path {
        font-family: Consolas, "Courier New", monospace;
        font-size: 14px;
      }
      .summary {
        margin: 6px 0 0;
        color: #334155;
      }
    </style>
  </head>
  <body>
    <div class="topbar">API docs · <a href="../">Back to docs home</a></div>
    <div id="status" class="status">Loading API documentation...</div>
    <div id="basic-docs" class="basic-docs"></div>
    <div id="redoc-container"></div>
    <script>
      const spec = ${openApiJson};

      const statusNode = document.getElementById("status");
      const basicDocsNode = document.getElementById("basic-docs");
      const container = document.getElementById("redoc-container");
      let initialized = false;

      const renderBasicDocs = () => {
        const endpoints = [];
        for (const [path, operations] of Object.entries(spec.paths || {})) {
          for (const [method, operation] of Object.entries(operations || {})) {
            endpoints.push({
              path,
              method,
              summary: operation.summary || "",
            });
          }
        }

        const endpointsHtml = endpoints
          .map(
            (item) =>
              '<div class="endpoint">' +
              '<div><span class="method">' +
              item.method +
              '</span><span class="path">' +
              item.path +
              '</span></div>' +
              '<p class="summary">' +
              (item.summary || "No summary") +
              '</p>' +
              '</div>',
          )
          .join("");

        basicDocsNode.innerHTML =
          '<h2 style="margin: 0 0 8px;">' +
          (spec.info?.title || "API Documentation") +
          '</h2>' +
          '<p style="margin: 0 0 12px; color: #334155;">' +
          (spec.info?.description || "") +
          '</p>' +
          '<p style="margin: 0 0 12px;">OpenAPI file: <a href="./openapi.json">openapi.json</a></p>' +
          endpointsHtml;
      };

      const showFallback = (reason) => {
        statusNode.innerHTML =
          "Showing basic docs. Redoc UI is unavailable (" +
          reason +
          ").";
      };

      renderBasicDocs();
      showFallback("loading");

      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/redoc@next/bundles/redoc.standalone.js";
      script.onload = () => {
        if (!window.Redoc) {
          showFallback("Redoc script is unavailable");
          return;
        }

        window.Redoc.init(spec, { hideDownloadButton: false }, container);
        initialized = true;
        basicDocsNode.style.display = "none";
        statusNode.style.display = "none";
      };
      script.onerror = () => showFallback("CDN is blocked or unavailable");

      document.body.appendChild(script);

      setTimeout(() => {
        if (!initialized) {
          showFallback("initialization timeout");
        }
      }, 5000);
    </script>
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
