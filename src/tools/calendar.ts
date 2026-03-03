import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { doorayFetch } from "../client.ts";
import { ok, err, bindTokenSchema, paginationSchema } from "../helpers.ts";

export function calendarTools(server: McpServer) {
  server.registerTool("create_calendar", {
    description: "새로운 캘린더를 생성합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      name: z.string().describe("캘린더 이름"),
      type: z.enum(["private", "subscription"]).describe("캘린더 타입"),
      calendarMemberList: z.array(z.record(z.unknown())).optional().describe("캘린더 멤버 목록"),
      me: z.record(z.unknown()).optional().describe("내 설정 (color 등)"),
      calendarUrl: z.string().optional().describe("구독 캘린더 URL (subscription인 경우 필수)"),
    },
  }, async ({ bind_token, ...body }) => {
    try {
      const data = await doorayFetch(bind_token, "/calendar/v1/calendars", {
        method: "POST",
        body,
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("list_calendars", {
    description: "캘린더 목록을 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      ...paginationSchema,
    },
  }, async ({ bind_token, page, size }) => {
    try {
      const data = await doorayFetch(bind_token, "/calendar/v1/calendars", {
        params: { page, size },
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("get_calendar", {
    description: "캘린더 상세를 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      calendar_id: z.string().describe("캘린더 ID"),
    },
  }, async ({ bind_token, calendar_id }) => {
    try {
      const data = await doorayFetch(bind_token, `/calendar/v1/calendars/${calendar_id}`);
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("delete_calendar", {
    description: "캘린더를 삭제합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      calendar_id: z.string().describe("캘린더 ID"),
    },
  }, async ({ bind_token, calendar_id }) => {
    try {
      const data = await doorayFetch(bind_token, `/calendar/v1/calendars/${calendar_id}`, {
        method: "DELETE",
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("update_calendar_members", {
    description: "캘린더 멤버를 업데이트합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      calendar_id: z.string().describe("캘린더 ID"),
      calendarMemberList: z.array(z.record(z.unknown())).describe("업데이트할 멤버 목록"),
    },
  }, async ({ bind_token, calendar_id, calendarMemberList }) => {
    try {
      const data = await doorayFetch(bind_token, `/calendar/v1/calendars/${calendar_id}/members`, {
        method: "PUT",
        body: { calendarMemberList },
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("create_event", {
    description: "캘린더에 이벤트를 생성합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      calendar_id: z.string().describe("캘린더 ID"),
      subject: z.string().describe("이벤트 제목"),
      startedAt: z.string().describe("시작 일시 (ISO8601)"),
      endedAt: z.string().describe("종료 일시 (ISO8601)"),
      users: z.array(z.record(z.unknown())).optional().describe("참석자 목록"),
      body: z.string().optional().describe("이벤트 본문"),
      wholeDayFlag: z.boolean().optional().describe("종일 이벤트 여부"),
      location: z.string().optional().describe("장소"),
      recurrenceRule: z.record(z.unknown()).optional().describe("반복 규칙"),
      personalSettings: z.record(z.unknown()).optional().describe("개인 설정"),
    },
  }, async ({ bind_token, calendar_id, ...body }) => {
    try {
      const data = await doorayFetch(bind_token, `/calendar/v1/calendars/${calendar_id}/events`, {
        method: "POST",
        body,
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("list_events", {
    description: "이벤트 목록을 조회합니다 (시간 범위 필수).",
    inputSchema: {
      bind_token: bindTokenSchema,
      timeMin: z.string().describe("조회 시작 시간 (ISO8601, 필수)"),
      timeMax: z.string().describe("조회 종료 시간 (ISO8601, 필수)"),
      calendars: z.string().optional().describe("캘린더 ID 목록 (콤마 구분)"),
      postType: z.string().optional().describe("게시물 타입"),
      category: z.string().optional().describe("카테고리"),
    },
  }, async ({ bind_token, timeMin, timeMax, calendars, postType, category }) => {
    try {
      const data = await doorayFetch(bind_token, "/calendar/v1/calendars/*/events", {
        params: { timeMin, timeMax, calendars, postType, category },
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("get_event", {
    description: "이벤트 상세를 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      calendar_id: z.string().describe("캘린더 ID"),
      event_id: z.string().describe("이벤트 ID"),
    },
  }, async ({ bind_token, calendar_id, event_id }) => {
    try {
      const data = await doorayFetch(bind_token, `/calendar/v1/calendars/${calendar_id}/events/${event_id}`);
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("update_event", {
    description: "이벤트를 수정합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      calendar_id: z.string().describe("캘린더 ID"),
      event_id: z.string().describe("이벤트 ID"),
      subject: z.string().optional().describe("이벤트 제목"),
      startedAt: z.string().optional().describe("시작 일시"),
      endedAt: z.string().optional().describe("종료 일시"),
      users: z.array(z.record(z.unknown())).optional().describe("참석자 목록"),
      body: z.string().optional().describe("이벤트 본문"),
      wholeDayFlag: z.boolean().optional().describe("종일 이벤트 여부"),
      location: z.string().optional().describe("장소"),
      recurrenceRule: z.record(z.unknown()).optional().describe("반복 규칙"),
      personalSettings: z.record(z.unknown()).optional().describe("개인 설정"),
    },
  }, async ({ bind_token, calendar_id, event_id, ...body }) => {
    try {
      const data = await doorayFetch(bind_token, `/calendar/v1/calendars/${calendar_id}/events/${event_id}`, {
        method: "PUT",
        body,
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("delete_event", {
    description: "이벤트를 삭제합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      calendar_id: z.string().describe("캘린더 ID"),
      event_id: z.string().describe("이벤트 ID"),
      deleteType: z.enum(["this", "wholeFromThis", "whole"]).optional().describe("삭제 범위 (반복 이벤트인 경우)"),
    },
  }, async ({ bind_token, calendar_id, event_id, deleteType }) => {
    try {
      const data = await doorayFetch(bind_token, `/calendar/v1/calendars/${calendar_id}/events/${event_id}/delete`, {
        method: "POST",
        body: deleteType ? { deleteType } : undefined,
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });
}
