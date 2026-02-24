import { z } from "zod";
import { randomBytes } from "node:crypto";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { db } from "../db.ts";

export function bindTool(server: McpServer) {
  server.registerTool("bind", {
    description: "Dooray 서버에 바인드하여 세션 토큰을 발급받습니다. 이후 다른 도구 호출 시 이 토큰을 사용합니다.",
    inputSchema: {
      server_id: z.number().int().positive().describe("바인드할 서버 ID"),
    },
  }, ({ server_id }) => {
    const token = db.query(
      "SELECT t.token FROM tokens t WHERE t.server_id = ?",
    ).get(server_id) as { token: string } | null;

    if (!token) {
      return {
        content: [{ type: "text" as const, text: `서버 ${server_id}에 등록된 토큰이 없습니다. 먼저 register_token으로 토큰을 등록하세요.` }],
        isError: true,
      };
    }

    const bindToken = randomBytes(4).toString("hex");

    db.run(
      "INSERT INTO bindings (bind_token, server_id) VALUES (?, ?)",
      [bindToken, server_id],
    );

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({ bind_token: bindToken }),
      }],
    };
  });
}
