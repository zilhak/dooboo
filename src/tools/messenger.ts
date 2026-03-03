import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { doorayFetch } from "../client.ts";
import { ok, err, bindTokenSchema } from "../helpers.ts";

export function messengerTools(server: McpServer) {
  server.registerTool("send_direct_message", {
    description: "1:1 메시지를 전송합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      organizationMemberId: z.string().describe("수신자 조직 멤버 ID"),
      text: z.string().describe("메시지 내용"),
    },
  }, async ({ bind_token, organizationMemberId, text }) => {
    try {
      const data = await doorayFetch(bind_token, "/messenger/v1/channels/direct-send", {
        method: "POST",
        body: { organizationMemberId, text },
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("list_channels", {
    description: "속한 대화방 목록을 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
    },
  }, async ({ bind_token }) => {
    try {
      const data = await doorayFetch(bind_token, "/messenger/v1/channels");
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("create_channel", {
    description: "대화방을 생성합니다 (direct 또는 private).",
    inputSchema: {
      bind_token: bindTokenSchema,
      type: z.enum(["direct", "private"]).describe("대화방 유형"),
      memberIds: z.array(z.string()).describe("멤버 ID 목록"),
      title: z.string().optional().describe("대화방 제목 (private인 경우)"),
      capacity: z.string().optional().describe("참여 가능 인원"),
      idType: z.enum(["email", "member-id"]).optional().describe("멤버 ID 유형"),
    },
  }, async ({ bind_token, idType, ...body }) => {
    try {
      const params: Record<string, string> = {};
      if (idType) params.idType = idType;
      const data = await doorayFetch(bind_token, "/messenger/v1/channels", {
        method: "POST",
        params,
        body,
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("join_channel_members", {
    description: "대화방에 멤버를 추가합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      channel_id: z.string().describe("대화방 ID"),
      memberIds: z.array(z.string()).describe("추가할 멤버 ID 목록"),
    },
  }, async ({ bind_token, channel_id, memberIds }) => {
    try {
      const data = await doorayFetch(bind_token, `/messenger/v1/channels/${channel_id}/members/join`, {
        method: "POST",
        body: { memberIds },
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("leave_channel_members", {
    description: "대화방에서 멤버를 제거합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      channel_id: z.string().describe("대화방 ID"),
      memberIds: z.array(z.string()).describe("제거할 멤버 ID 목록"),
    },
  }, async ({ bind_token, channel_id, memberIds }) => {
    try {
      const data = await doorayFetch(bind_token, `/messenger/v1/channels/${channel_id}/members/leave`, {
        method: "POST",
        body: { memberIds },
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("send_channel_message", {
    description: "대화방에 메시지를 전송합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      channel_id: z.string().describe("대화방 ID (또는 쓰레드 채널 ID)"),
      text: z.string().describe("메시지 내용"),
    },
  }, async ({ bind_token, channel_id, text }) => {
    try {
      const data = await doorayFetch(bind_token, `/messenger/v1/channels/${channel_id}/logs`, {
        method: "POST",
        body: { text },
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("create_thread_message", {
    description: "대화방에 쓰레드를 가진 메시지를 전송합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      channel_id: z.string().describe("대화방 ID"),
      text: z.string().describe("대화방에 보낼 메시지"),
      threadText: z.string().optional().describe("글타래에 보낼 메시지"),
    },
  }, async ({ bind_token, channel_id, text, threadText }) => {
    try {
      const body: Record<string, string> = { text };
      if (threadText) body.threadText = threadText;
      const data = await doorayFetch(bind_token, `/messenger/v1/channels/${channel_id}/threads/create-and-send`, {
        method: "POST",
        body,
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("update_channel_message", {
    description: "대화방 메시지를 수정합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      channel_id: z.string().describe("대화방 ID"),
      log_id: z.string().describe("메시지 ID (log-id)"),
      text: z.string().describe("수정할 메시지 내용"),
    },
  }, async ({ bind_token, channel_id, log_id, text }) => {
    try {
      const data = await doorayFetch(bind_token, `/messenger/v1/channels/${channel_id}/logs/${log_id}`, {
        method: "PUT",
        body: { text },
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("delete_channel_message", {
    description: "대화방 메시지를 삭제합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      channel_id: z.string().describe("대화방 ID"),
      log_id: z.string().describe("메시지 ID (log-id)"),
    },
  }, async ({ bind_token, channel_id, log_id }) => {
    try {
      const data = await doorayFetch(bind_token, `/messenger/v1/channels/${channel_id}/logs/${log_id}`, {
        method: "DELETE",
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });
}
