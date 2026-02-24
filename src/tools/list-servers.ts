import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { db } from "../db.ts";

interface ServerRow {
  id: number;
  url: string;
  hasToken: number;
}

export function listServersTool(server: McpServer) {
  server.registerTool("list_servers", {
    description: "등록된 Dooray 서버 목록을 조회합니다",
  }, () => {
    const rows = db.query(`
      SELECT s.id, s.url, CASE WHEN t.token IS NOT NULL THEN 1 ELSE 0 END as hasToken
      FROM servers s
      LEFT JOIN tokens t ON s.id = t.server_id
      ORDER BY s.id
    `).all() as ServerRow[];

    const result = rows.map((r) => ({
      id: r.id,
      url: r.url,
      hasToken: r.hasToken === 1,
    }));

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify(result, null, 2),
      }],
    };
  });
}
