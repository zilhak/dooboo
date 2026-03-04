import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { doorayFetch } from "../client.ts";
import { ok, err, okList, bindTokenSchema, paginationSchema } from "../helpers.ts";

export function commonTools(server: McpServer) {
  server.registerTool("list_members", {
    description: "멤버 목록을 조회합니다. 외부 이메일 주소로 검색할 수 있습니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      externalEmailAddresses: z.string().optional().describe("검색할 외부 이메일 주소 (콤마 구분)"),
      name: z.string().optional().describe("사용자 이름 검색"),
      userCode: z.string().optional().describe("사용자 ID like 검색"),
      userCodeExact: z.string().optional().describe("사용자 ID 정확히 일치 검색"),
      ...paginationSchema,
    },
  }, async ({ bind_token, ...params }) => {
    try {
      const data = await doorayFetch(bind_token, "/common/v1/members", { params: params as Record<string, string | number | undefined> });
      return okList(data as { result?: Array<{ id?: string; organizationMemberId?: string; name?: string; userCode?: string; emailAddress?: string }>; totalCount?: number }, (m) => ({
        id: m.organizationMemberId ?? m.id, name: m.name, userCode: m.userCode, emailAddress: m.emailAddress,
      }));
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("get_member", {
    description: "멤버 상세 정보를 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      member_id: z.string().describe("조회할 멤버 ID"),
    },
  }, async ({ bind_token, member_id }) => {
    try {
      const data = await doorayFetch(bind_token, `/common/v1/members/${member_id}`);
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("get_me", {
    description: "현재 인증된 사용자(나)의 정보를 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
    },
  }, async ({ bind_token }) => {
    try {
      const data = await doorayFetch(bind_token, "/common/v1/members/me");
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("create_incoming_hook", {
    description: "Incoming Hook을 생성합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      name: z.string().describe("Dooray 화면에 표시되는 Bot 이름"),
      serviceType: z.string().describe("서비스 타입 (github, jenkins, trello, newrelic, jira, bitbucket, ifttt, incoming)"),
      projectIds: z.array(z.string()).describe("프로젝트 ID 목록"),
    },
  }, async ({ bind_token, name, serviceType, projectIds }) => {
    try {
      const data = await doorayFetch(bind_token, "/common/v1/incoming-hooks", {
        method: "POST",
        body: { name, serviceType, projectIds },
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("get_incoming_hook", {
    description: "Incoming Hook 정보를 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      incoming_hook_id: z.string().describe("Incoming Hook ID"),
    },
  }, async ({ bind_token, incoming_hook_id }) => {
    try {
      const data = await doorayFetch(bind_token, `/common/v1/incoming-hooks/${incoming_hook_id}`);
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("delete_incoming_hook", {
    description: "Incoming Hook을 삭제합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      incoming_hook_id: z.string().describe("삭제할 Incoming Hook ID"),
    },
  }, async ({ bind_token, incoming_hook_id }) => {
    try {
      const data = await doorayFetch(bind_token, `/common/v1/incoming-hooks/${incoming_hook_id}`, {
        method: "DELETE",
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });
}
