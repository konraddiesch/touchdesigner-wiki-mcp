#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  searchWiki,
  getWikiPage,
  getWikiPageContent,
  getCategoryPages,
  getCategories,
  getOperatorInfo,
} from "./wiki-client.js";

// Create server instance
const server = new McpServer({
  name: "touchdesigner-wiki-mcp",
  version: "1.0.0",
});

// Tool: Search the TouchDesigner wiki
server.tool(
  "search_wiki",
  "Search the TouchDesigner documentation wiki for articles matching a query",
  {
    query: z.string().describe("Search query (e.g., 'noise', 'CHOP', 'python scripting')"),
    limit: z.number().optional().default(10).describe("Maximum number of results (default: 10)"),
  },
  async ({ query, limit }) => {
    try {
      const results = await searchWiki(query, limit);

      if (results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No results found for "${query}"`,
            },
          ],
        };
      }

      const formatted = results
        .map((r, i) => `${i + 1}. **${r.title}**\n   ${r.snippet}\n   URL: ${r.url}`)
        .join("\n\n");

      return {
        content: [
          {
            type: "text",
            text: `Found ${results.length} results for "${query}":\n\n${formatted}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error searching wiki: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: Get a specific wiki page
server.tool(
  "get_wiki_page",
  "Get the full content of a specific TouchDesigner wiki page",
  {
    title: z.string().describe("The title of the wiki page (e.g., 'Noise TOP', 'Python', 'CHOP')"),
    format: z
      .enum(["html", "wikitext"])
      .optional()
      .default("html")
      .describe("Content format: 'html' for rendered content, 'wikitext' for raw wiki markup"),
  },
  async ({ title, format }) => {
    try {
      const page = format === "wikitext"
        ? await getWikiPageContent(title)
        : await getWikiPage(title);

      let text = `# ${page.title}\n\n`;
      text += `**URL:** ${page.url}\n\n`;

      if (page.categories.length > 0) {
        text += `**Categories:** ${page.categories.join(", ")}\n\n`;
      }

      text += "---\n\n";
      text += page.content;

      return {
        content: [
          {
            type: "text",
            text,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching page: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: Get operator documentation
server.tool(
  "get_operator",
  "Get documentation for a specific TouchDesigner operator (CHOP, TOP, SOP, DAT, COMP, MAT)",
  {
    name: z.string().describe("Operator name (e.g., 'Noise', 'Filter', 'Math', 'Composite')"),
    type: z
      .enum(["CHOP", "TOP", "SOP", "DAT", "COMP", "MAT", "POP", "auto"])
      .optional()
      .default("auto")
      .describe("Operator type. Use 'auto' to search across all types."),
  },
  async ({ name, type }) => {
    try {
      let searchName = name;
      if (type && type !== "auto") {
        searchName = `${name} ${type}`;
      }

      const page = await getOperatorInfo(searchName);

      let text = `# ${page.title}\n\n`;
      text += `**URL:** ${page.url}\n\n`;

      if (page.categories.length > 0) {
        text += `**Categories:** ${page.categories.join(", ")}\n\n`;
      }

      text += "---\n\n";
      text += page.content;

      return {
        content: [
          {
            type: "text",
            text,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching operator info: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: List pages in a category
server.tool(
  "list_category",
  "List all wiki pages in a specific category",
  {
    category: z.string().describe("Category name (e.g., 'TOPs', 'CHOPs', 'Python')"),
    limit: z.number().optional().default(50).describe("Maximum number of pages to return"),
  },
  async ({ category, limit }) => {
    try {
      const pages = await getCategoryPages(category, limit);

      if (pages.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No pages found in category "${category}"`,
            },
          ],
        };
      }

      const formatted = pages.map((p) => `- [${p.title}](${p.url})`).join("\n");

      return {
        content: [
          {
            type: "text",
            text: `**Category: ${category}** (${pages.length} pages)\n\n${formatted}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching category: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: List all categories
server.tool(
  "list_categories",
  "List all available categories in the TouchDesigner wiki",
  {
    limit: z.number().optional().default(100).describe("Maximum number of categories to return"),
  },
  async ({ limit }) => {
    try {
      const categories = await getCategories(limit);

      if (categories.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No categories found",
            },
          ],
        };
      }

      const formatted = categories
        .map((c) => `- **${c.name}** (${c.pageCount ?? "?"} pages)`)
        .join("\n");

      return {
        content: [
          {
            type: "text",
            text: `**Available Categories** (${categories.length} total)\n\n${formatted}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching categories: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: Get quick reference for operator types
server.tool(
  "operator_types",
  "Get an overview of TouchDesigner operator families and their purposes",
  {},
  async () => {
    const overview = `# TouchDesigner Operator Families

TouchDesigner organizes nodes into operator families, each handling different data types:

## **CHOP** - Channel Operators
Process and generate **channel data** (animation curves, audio, sensor data, control signals).
Examples: Noise CHOP, Filter CHOP, Math CHOP, Audio File In CHOP

## **TOP** - Texture Operators
Process and generate **2D images and video** (compositing, effects, rendering).
Examples: Noise TOP, Composite TOP, Movie File In TOP, Render TOP

## **SOP** - Surface Operators
Create and manipulate **3D geometry** (modeling, deformation, procedural geometry).
Examples: Sphere SOP, Grid SOP, Transform SOP, Noise SOP

## **DAT** - Data Operators
Handle **text and tables** (scripting, data parsing, communication).
Examples: Table DAT, Text DAT, Execute DAT, Web Client DAT

## **COMP** - Component Operators
**Containers and UI elements** (panels, windows, 3D scenes, networks).
Examples: Container COMP, Geo COMP, Camera COMP, Light COMP

## **MAT** - Material Operators
Define **surface materials and shaders** for 3D rendering.
Examples: Phong MAT, PBR MAT, GLSL MAT, Constant MAT

## **POP** - Point Operators (New in 2025)
Process **point clouds and particle systems** with GPU acceleration.
Examples: Point Generate POP, Point Render POP, Point Transform POP

---
Use \`get_operator\` to get detailed documentation for any specific operator.
Use \`list_category\` with categories like "TOPs", "CHOPs", "SOPs" to browse operators.`;

    return {
      content: [
        {
          type: "text",
          text: overview,
        },
      ],
    };
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("TouchDesigner Wiki MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
