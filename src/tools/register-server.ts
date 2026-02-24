import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { db } from "../db.ts";

export function registerServerTool(server: McpServer) {
  server.registerTool("register_server", {
    description: "Dooray 서버 URL을 등록합니다",
    inputSchema: {
      url: z.string().url().describe("Dooray 사이트 URL (예: https://nhnent.dooray.com/)"),
    },
  }, ({ url }) => {
    const normalized = url.endsWith("/") ? url : `${url}/`;

    try {
      const result = db.run(
        "INSERT INTO servers (url) VALUES (?)",
        [normalized],
      );

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ id: Number(result.lastInsertRowid), url: normalized }),
        }],
      };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      if (message.includes("UNIQUE")) {
        return {
          content: [{ type: "text" as const, text: `이미 등록된 서버입니다: ${normalized}` }],
          isError: true,
        };
      }
      throw e;
    }
  });
}
