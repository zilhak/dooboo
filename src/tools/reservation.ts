import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { doorayFetch } from "../client.ts";
import { ok, err, okList, bindTokenSchema, paginationSchema, filterSchema } from "../helpers.ts";

export function reservationTools(server: McpServer) {
  server.registerTool("list_resource_categories", {
    description: "사용함 상태의 자원 유형(공간, 사무기기, 휴대폰, 차량) 목록을 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      ...paginationSchema,
      ...filterSchema,
    },
  }, async ({ bind_token, filter, page, size }) => {
    try {
      const data = await doorayFetch(bind_token, "/reservation/v1/resource-categories", { params: { page, size } });
      return okList(data as { result?: Array<{ id: string; name?: string }>; totalCount?: number }, (c) => ({
        id: c.id, name: c.name,
      }), filter);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("list_resources", {
    description: "사용함 상태의 자원 목록을 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      resourceCategoryId: z.string().optional().describe("자원 유형 ID로 필터"),
      ...filterSchema,
    },
  }, async ({ bind_token, filter, resourceCategoryId }) => {
    try {
      const data = await doorayFetch(bind_token, "/reservation/v1/resources", { params: { resourceCategoryId } });
      return okList(data as { result?: Array<{ id: string; name?: string; resourceCategoryId?: string; description?: string }>; totalCount?: number }, (r) => ({
        id: r.id, name: r.name, categoryId: r.resourceCategoryId, description: r.description,
      }), filter);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("get_resource", {
    description: "자원 단건을 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      resource_id: z.string().describe("자원 ID"),
    },
  }, async ({ bind_token, resource_id }) => {
    try {
      const data = await doorayFetch(bind_token, `/reservation/v1/resources/${resource_id}`);
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("list_reservable_resources", {
    description: "예약 가능한 자원 목록을 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      resourceCategoryId: z.string().optional().describe("자원 유형 ID로 필터"),
      ...filterSchema,
    },
  }, async ({ bind_token, filter, resourceCategoryId }) => {
    try {
      const data = await doorayFetch(bind_token, "/reservation/v1/reservable-resources", { params: { resourceCategoryId } });
      return okList(data as { result?: Array<{ id: string; name?: string; resourceCategoryId?: string }>; totalCount?: number }, (r) => ({
        id: r.id, name: r.name, categoryId: r.resourceCategoryId,
      }), filter);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("list_resource_reservations", {
    description: "자원 예약 목록을 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      timeMin: z.string().describe("조회 시작 시간 (ISO8601, 필수)"),
      timeMax: z.string().describe("조회 종료 시간 (ISO8601, 필수)"),
      resourceIds: z.string().optional().describe("자원 ID 목록 (콤마 구분)"),
      ...paginationSchema,
      ...filterSchema,
    },
  }, async ({ bind_token, filter, timeMin, timeMax, resourceIds, page, size }) => {
    try {
      const data = await doorayFetch(bind_token, "/reservation/v1/resource-reservations", {
        params: { timeMin, timeMax, resourceIds, page, size },
      });
      return okList(data as { result?: Array<{ id: string; resourceId?: string; subject?: string; startedAt?: string; endedAt?: string; creator?: { member?: { organizationMemberId?: string } } }>; totalCount?: number }, (r) => ({
        id: r.id, resourceId: r.resourceId, subject: r.subject, startedAt: r.startedAt, endedAt: r.endedAt, creatorId: r.creator?.member?.organizationMemberId,
      }), filter);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("create_resource_reservation", {
    description: "자원을 예약합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      resourceId: z.string().describe("예약할 자원 ID"),
      subject: z.string().describe("예약 내용"),
      startedAt: z.string().describe("예약 시작 시간 (ISO8601)"),
      endedAt: z.string().describe("예약 종료 시간 (ISO8601)"),
      wholeDayFlag: z.boolean().optional().describe("종일 예약 여부"),
      recurrenceRule: z.record(z.unknown()).optional().describe("반복 예약 규칙"),
      alarms: z.array(z.record(z.unknown())).optional().describe("알림 설정"),
      class: z.string().optional().describe("공개 범위 (public/private)"),
    },
  }, async ({ bind_token, ...body }) => {
    try {
      const data = await doorayFetch(bind_token, "/reservation/v1/resource-reservations", {
        method: "POST",
        body,
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("get_resource_reservation", {
    description: "자원 예약 상세를 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      resource_reservation_id: z.string().describe("자원 예약 ID"),
    },
  }, async ({ bind_token, resource_reservation_id }) => {
    try {
      const data = await doorayFetch(bind_token, `/reservation/v1/resource-reservations/${resource_reservation_id}`);
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("update_resource_reservation", {
    description: "자원 예약을 수정합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      resource_reservation_id: z.string().describe("자원 예약 ID"),
      subject: z.string().optional().describe("예약 내용"),
      startedAt: z.string().optional().describe("예약 시작 시간 (ISO8601)"),
      endedAt: z.string().optional().describe("예약 종료 시간 (ISO8601)"),
      wholeDayFlag: z.boolean().optional().describe("종일 예약 여부"),
      updateType: z.string().optional().describe("수정 범위 (whole/this/wholeFromThis)"),
      recurrenceRule: z.record(z.unknown()).optional().describe("반복 예약 규칙"),
      alarms: z.array(z.record(z.unknown())).optional().describe("알림 설정"),
      class: z.string().optional().describe("공개 범위"),
    },
  }, async ({ bind_token, resource_reservation_id, ...body }) => {
    try {
      const data = await doorayFetch(bind_token, `/reservation/v1/resource-reservations/${resource_reservation_id}`, {
        method: "PUT",
        body,
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("delete_resource_reservation", {
    description: "자원 예약을 삭제합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      resource_reservation_id: z.string().describe("자원 예약 ID"),
      deleteType: z.string().optional().describe("삭제 범위 (whole/this/wholeFromThis, 반복 예약인 경우)"),
    },
  }, async ({ bind_token, resource_reservation_id, deleteType }) => {
    try {
      const data = await doorayFetch(bind_token, `/reservation/v1/resource-reservations/${resource_reservation_id}`, {
        method: "DELETE",
        body: deleteType ? { deleteType } : undefined,
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });
}
