import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { db } from "../db.ts";

export function registerTokenTool(server: McpServer) {
  server.registerTool("register_token", {
    description: "서버에 Dooray API 인증 토큰을 등록합니다",
    inputSchema: {
      server_id: z.number().int().positive().describe("서버 ID"),
      token: z.string().min(1).describe("Dooray API 토큰"),
    },
  }, ({ server_id, token }) => {
    const srv = db.query("SELECT id FROM servers WHERE id = ?").get(server_id) as { id: number } | null;
    if (!srv) {
      return {
        content: [{ type: "text" as const, text: `서버를 찾을 수 없습니다: id=${server_id}` }],
        isError: true,
      };
    }

    db.run(
      "INSERT INTO tokens (server_id, token) VALUES (?, ?) ON CONFLICT(server_id) DO UPDATE SET token = excluded.token",
      [server_id, token],
    );

    return {
      content: [{ type: "text" as const, text: `서버 ${server_id}에 토큰이 등록되었습니다.` }],
    };
  });
}
