import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function generateDbDocsIndex() {
  const docsDbDir = join(process.cwd(), "docs", "db");
  mkdirSync(docsDbDir, { recursive: true });

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Shop Comparison Platform DB Docs</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        background: #f1f5f9;
        color: #0f172a;
      }
      .container {
        max-width: 1100px;
        margin: 0 auto;
        padding: 24px 16px 40px;
      }
      .top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .button {
        display: inline-block;
        text-decoration: none;
        color: #fff;
        background: #1d4ed8;
        border-radius: 10px;
        padding: 10px 14px;
        font-weight: 600;
      }
      .button.secondary {
        background: #334155;
      }
      .card {
        margin-top: 16px;
        background: #fff;
        border: 1px solid #cbd5e1;
        border-radius: 12px;
        overflow: hidden;
      }
      .card h2 {
        margin: 0;
        padding: 14px 16px;
        border-bottom: 1px solid #e2e8f0;
        font-size: 18px;
      }
      .card .content {
        padding: 16px;
      }
      .diagram-wrap {
        overflow: auto;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background: #fff;
      }
      .diagram-wrap img {
        display: block;
        width: 100%;
        height: auto;
      }
      p {
        margin: 0 0 12px;
        line-height: 1.5;
        color: #334155;
      }
    </style>
  </head>
  <body>
    <main class="container">
      <div class="top">
        <h1>Database Documentation</h1>
        <div>
          <a class="button secondary" href="../">Back to docs home</a>
          <a class="button" href="./reference/">Open Prisma reference</a>
        </div>
      </div>

      <section class="card">
        <h2>ERD visualization</h2>
        <div class="content">
          <p>Entity-relationship diagram generated from Prisma schema.</p>
          <div class="diagram-wrap">
            <img src="./erd.svg" alt="Database ERD diagram" />
          </div>
        </div>
      </section>
    </main>
  </body>
</html>
`;

  writeFileSync(join(docsDbDir, "index.html"), html, "utf8");
}

generateDbDocsIndex();
