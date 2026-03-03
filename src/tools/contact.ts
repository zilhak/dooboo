import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { doorayFetch } from "../client.ts";
import { ok, err, bindTokenSchema, paginationSchema } from "../helpers.ts";

export function contactTools(server: McpServer) {
  server.registerTool("list_contacts", {
    description: "내 주소록 목록을 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      ...paginationSchema,
    },
  }, async ({ bind_token, page, size }) => {
    try {
      const data = await doorayFetch(bind_token, "/contacts/v1/contacts", { params: { page, size } });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("get_contact", {
    description: "내 주소록 단건을 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      contact_id: z.string().describe("연락처 ID"),
    },
  }, async ({ bind_token, contact_id }) => {
    try {
      const data = await doorayFetch(bind_token, `/contacts/v1/contacts/${contact_id}`);
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("search_contacts", {
    description: "내 주소록 내에서 검색합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      query: z.string().describe("검색어"),
    },
  }, async ({ bind_token, query }) => {
    try {
      const data = await doorayFetch(bind_token, "/contacts/v1/contacts/search", {
        method: "POST",
        body: { all: [query] },
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });
}
