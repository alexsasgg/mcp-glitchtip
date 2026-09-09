#!/usr/bin/env node

/**
 * This is an MCP server that connects to GlitchTip for error monitoring.
 */

import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { GlitchTipClient } from "./glitchtip.js";
import { z } from "zod";

const server = new McpServer({
  name: "mcp-glitchtip",
  version: "0.1.3",
});

// Initialize GlitchTip client with environment variables
const glitchTipClient = new GlitchTipClient({
  baseUrl: process.env.GLITCHTIP_BASE_URL || "https://app.glitchtip.com",
  token: process.env.GLITCHTIP_TOKEN,
  sessionId: process.env.GLITCHTIP_SESSION_ID,
  organization: process.env.GLITCHTIP_ORGANIZATION!,
});

// Register resources
server.resource(
  "issues",
  new ResourceTemplate("glitchtip://issues", {
    list: () => ({
      resources: [
        {
          uri: "glitchtip://issues",
          mimeType: "application/json",
          name: "GlitchTip Issues",
          description: "All issues from GlitchTip error monitoring",
        },
      ],
    }),
  }),
  async (uri) => {
    try {
      const result = await glitchTipClient.getIssues({ status: "unresolved" });
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(result.data, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/plain",
            text:
              error instanceof Error ? error.message : "Error fetching issues",
          },
        ],
      };
    }
  },
);

// Register tools
server.tool(
  "glitchtip_issues",
  "Get all issues from GlitchTip with pagination support",
  {
    status: z
      .enum(["unresolved", "resolved", "all"])
      .optional()
      .describe("Filter by issue status (default: unresolved)"),
    cursor: z
      .string()
      .optional()
      .describe(
        "Cursor for pagination. Omit for first page, use nextCursor from previous response for next pages",
      ),
    perPage: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .describe("Number of issues per page (default: 50)"),
  },
  async ({ status, cursor, perPage }) => {
    try {
      const result = await glitchTipClient.getIssues({
        status: status || "unresolved",
        cursor,
        perPage: perPage || 50,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                issues: result.data,
                nextCursor: result.nextCursor,
                previousCursor: result.previousCursor,
                pageSize: result.data.length,
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text:
              error instanceof Error ? error.message : "Error fetching issues",
          },
        ],
      };
    }
  },
);

server.tool(
  "glitchtip_latest_event",
  "Get the latest event for a specific issue",
  {
    issueId: z.string().describe("The issue ID to get the latest event for"),
  },
  async ({ issueId }) => {
    try {
      const event = await glitchTipClient.getIssueEvents(issueId, true);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(event, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text:
              error instanceof Error
                ? error.message
                : "Error fetching latest event",
          },
        ],
      };
    }
  },
);

/**
 * Start the server using stdio transport.
 * This allows the server to communicate via standard input/output streams.
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
