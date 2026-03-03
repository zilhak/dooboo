import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { doorayFetch } from "../client.ts";
import { ok, err, bindTokenSchema, paginationSchema } from "../helpers.ts";

export function driveTools(server: McpServer) {
  server.registerTool("list_drives", {
    description: "드라이브 목록을 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      projectId: z.string().optional().describe("프로젝트 ID"),
      type: z.enum(["private", "project"]).optional().describe("드라이브 유형 (private/project)"),
      scope: z.enum(["private", "public"]).optional().describe("프로젝트 범위 (type=project인 경우)"),
      state: z.string().optional().describe("프로젝트 상태 (active,archived)"),
    },
  }, async ({ bind_token, ...params }) => {
    try {
      const data = await doorayFetch(bind_token, "/drive/v1/drives", {
        params: params as Record<string, string | undefined>,
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("get_drive", {
    description: "드라이브 상세를 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      drive_id: z.string().describe("드라이브 ID"),
    },
  }, async ({ bind_token, drive_id }) => {
    try {
      const data = await doorayFetch(bind_token, `/drive/v1/drives/${drive_id}`);
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("list_drive_changes", {
    description: "드라이브 내 변경사항을 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      drive_id: z.string().describe("드라이브 ID"),
      latestRevision: z.number().optional().describe("조회 기준 revision (기본 0)"),
      fileId: z.string().optional().describe("기준 파일 ID"),
      size: z.number().optional().describe("조회 개수 (기본 20, 최대 200)"),
    },
  }, async ({ bind_token, drive_id, latestRevision, fileId, size }) => {
    try {
      const data = await doorayFetch(bind_token, `/drive/v1/drives/${drive_id}/changes`, {
        params: { latestRevision, fileId, size },
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("get_file_meta_by_id", {
    description: "파일 ID로 메타 정보를 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      file_id: z.string().describe("파일 ID"),
    },
  }, async ({ bind_token, file_id }) => {
    try {
      const data = await doorayFetch(bind_token, `/drive/v1/files/${file_id}`, {
        params: { media: "meta" },
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("list_drive_files", {
    description: "드라이브 파일 목록을 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      drive_id: z.string().describe("드라이브 ID"),
      type: z.string().optional().describe("파일 유형 (folder/file)"),
      subTypes: z.string().optional().describe("하위 유형 (root,trash 등 콤마 구분)"),
      parentId: z.string().optional().describe("상위 폴더 ID"),
      ...paginationSchema,
    },
  }, async ({ bind_token, drive_id, type, subTypes, parentId, page, size }) => {
    try {
      const data = await doorayFetch(bind_token, `/drive/v1/drives/${drive_id}/files`, {
        params: { type, subTypes, parentId, page, size },
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("get_drive_file_meta", {
    description: "드라이브 파일 메타 정보를 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      drive_id: z.string().describe("드라이브 ID"),
      file_id: z.string().describe("파일 ID"),
    },
  }, async ({ bind_token, drive_id, file_id }) => {
    try {
      const data = await doorayFetch(bind_token, `/drive/v1/drives/${drive_id}/files/${file_id}`, {
        params: { media: "meta" },
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("rename_drive_file", {
    description: "드라이브 파일/폴더 이름을 변경합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      drive_id: z.string().describe("드라이브 ID"),
      file_id: z.string().describe("파일 ID"),
      name: z.string().describe("새 이름"),
    },
  }, async ({ bind_token, drive_id, file_id, name }) => {
    try {
      const data = await doorayFetch(bind_token, `/drive/v1/drives/${drive_id}/files/${file_id}`, {
        method: "PUT",
        params: { media: "meta" },
        body: { name },
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("delete_drive_file", {
    description: "드라이브 파일을 영구 삭제합니다 (휴지통 내 파일만 가능).",
    inputSchema: {
      bind_token: bindTokenSchema,
      drive_id: z.string().describe("드라이브 ID"),
      file_id: z.string().describe("파일 ID"),
    },
  }, async ({ bind_token, drive_id, file_id }) => {
    try {
      const data = await doorayFetch(bind_token, `/drive/v1/drives/${drive_id}/files/${file_id}`, {
        method: "DELETE",
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("create_drive_folder", {
    description: "드라이브에 폴더를 생성합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      drive_id: z.string().describe("드라이브 ID"),
      folder_id: z.string().describe("상위 폴더 ID"),
      name: z.string().describe("폴더 이름"),
    },
  }, async ({ bind_token, drive_id, folder_id, name }) => {
    try {
      const data = await doorayFetch(bind_token, `/drive/v1/drives/${drive_id}/files/${folder_id}/create-folder`, {
        method: "POST",
        body: { name },
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("copy_drive_file", {
    description: "드라이브 파일을 복사합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      drive_id: z.string().describe("드라이브 ID"),
      file_id: z.string().describe("복사할 파일 ID"),
      destinationDriveId: z.string().describe("대상 드라이브 ID"),
      destinationFileId: z.string().describe("대상 폴더 ID"),
    },
  }, async ({ bind_token, drive_id, file_id, destinationDriveId, destinationFileId }) => {
    try {
      const data = await doorayFetch(bind_token, `/drive/v1/drives/${drive_id}/files/${file_id}/copy`, {
        method: "POST",
        body: { destinationDriveId, destinationFileId },
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("move_drive_file", {
    description: "드라이브 파일을 이동합니다 (휴지통 이동: destinationFileId='trash').",
    inputSchema: {
      bind_token: bindTokenSchema,
      drive_id: z.string().describe("드라이브 ID"),
      file_id: z.string().describe("이동할 파일 ID"),
      destinationFileId: z.string().describe("대상 폴더 ID (또는 'trash')"),
    },
  }, async ({ bind_token, drive_id, file_id, destinationFileId }) => {
    try {
      const data = await doorayFetch(bind_token, `/drive/v1/drives/${drive_id}/files/${file_id}/move`, {
        method: "POST",
        body: { destinationFileId },
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  // Shared Links
  server.registerTool("create_drive_shared_link", {
    description: "드라이브 파일 공유 링크를 생성합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      drive_id: z.string().describe("드라이브 ID"),
      file_id: z.string().describe("파일 ID"),
      scope: z.enum(["member", "memberAndGuest", "memberAndGuestAndExternal"]).describe("공유 범위"),
      expiredAt: z.string().describe("만료 시간 (ISO8601)"),
    },
  }, async ({ bind_token, drive_id, file_id, scope, expiredAt }) => {
    try {
      const data = await doorayFetch(bind_token, `/drive/v1/drives/${drive_id}/files/${file_id}/shared-links`, {
        method: "POST",
        body: { scope, expiredAt },
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("list_drive_shared_links", {
    description: "드라이브 파일의 공유 링크 목록을 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      drive_id: z.string().describe("드라이브 ID"),
      file_id: z.string().describe("파일 ID"),
      valid: z.boolean().optional().describe("유효한 링크만 조회 (기본값 true)"),
    },
  }, async ({ bind_token, drive_id, file_id, valid }) => {
    try {
      const data = await doorayFetch(bind_token, `/drive/v1/drives/${drive_id}/files/${file_id}/shared-links`, {
        params: { valid },
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("get_drive_shared_link", {
    description: "드라이브 파일의 특정 공유 링크를 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      drive_id: z.string().describe("드라이브 ID"),
      file_id: z.string().describe("파일 ID"),
      link_id: z.string().describe("공유 링크 ID"),
    },
  }, async ({ bind_token, drive_id, file_id, link_id }) => {
    try {
      const data = await doorayFetch(bind_token, `/drive/v1/drives/${drive_id}/files/${file_id}/shared-links/${link_id}`);
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("update_drive_shared_link", {
    description: "드라이브 파일의 공유 링크를 수정합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      drive_id: z.string().describe("드라이브 ID"),
      file_id: z.string().describe("파일 ID"),
      link_id: z.string().describe("공유 링크 ID"),
      scope: z.enum(["member", "memberAndGuest", "memberAndGuestAndExternal"]).optional().describe("공유 범위"),
      expiredAt: z.string().optional().describe("만료 시간 (ISO8601)"),
    },
  }, async ({ bind_token, drive_id, file_id, link_id, scope, expiredAt }) => {
    try {
      const data = await doorayFetch(bind_token, `/drive/v1/drives/${drive_id}/files/${file_id}/shared-links/${link_id}`, {
        method: "PUT",
        body: { scope, expiredAt },
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("delete_drive_shared_link", {
    description: "드라이브 파일의 공유 링크를 삭제합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      drive_id: z.string().describe("드라이브 ID"),
      file_id: z.string().describe("파일 ID"),
      link_id: z.string().describe("공유 링크 ID"),
    },
  }, async ({ bind_token, drive_id, file_id, link_id }) => {
    try {
      const data = await doorayFetch(bind_token, `/drive/v1/drives/${drive_id}/files/${file_id}/shared-links/${link_id}`, {
        method: "DELETE",
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });
}
