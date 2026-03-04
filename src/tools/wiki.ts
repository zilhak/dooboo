import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { doorayFetch } from "../client.ts";
import { ok, err, okList, bindTokenSchema, paginationSchema } from "../helpers.ts";

export function wikiTools(server: McpServer) {
  server.registerTool("list_wikis", {
    description: "접근 가능한 위키 목록을 조회합니다. 각 프로젝트는 자체 위키 공간을 가지며, 여기서 해당 위키 ID를 확인할 수 있습니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      ...paginationSchema,
    },
  }, async ({ bind_token, page, size }) => {
    try {
      const data = await doorayFetch(bind_token, "/wiki/v1/wikis", { params: { page, size } });
      return okList(data as { result?: Array<{ id: string; name?: string }>; totalCount?: number }, (w) => ({
        id: w.id, name: w.name,
      }));
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("get_wiki_page_by_id", {
    description: "위키 페이지를 ID로 직접 조회합니다 (본문 포함).",
    inputSchema: {
      bind_token: bindTokenSchema,
      page_id: z.string().describe("위키 페이지 ID"),
    },
  }, async ({ bind_token, page_id }) => {
    try {
      const data = await doorayFetch(bind_token, `/wiki/v1/pages/${page_id}`);
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("create_wiki_page", {
    description: "위키에 새 페이지를 생성합니다. 마크다운 본문을 지원하며, 부모 페이지를 지정하여 계층 구조를 만들 수 있습니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      wiki_id: z.string().describe("위키 ID"),
      subject: z.string().describe("페이지 제목"),
      body: z.object({
        mimeType: z.string().optional().describe("본문 형식 (text/x-markdown)"),
        content: z.string().describe("본문 내용"),
      }).describe("페이지 본문"),
      parentPageId: z.string().optional().describe("부모 페이지 ID"),
      attachFileIds: z.array(z.string()).optional().describe("첨부 파일 ID 목록"),
      referrers: z.array(z.record(z.unknown())).optional().describe("참조자 목록"),
    },
  }, async ({ bind_token, wiki_id, ...body }) => {
    try {
      const data = await doorayFetch(bind_token, `/wiki/v1/wikis/${wiki_id}/pages`, {
        method: "POST",
        body,
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("list_wiki_pages", {
    description: "위키 페이지 목록을 조회합니다 (한 depth의 형제 페이지들). parentPageId를 지정하면 해당 페이지의 하위 페이지들을, 생략하면 최상위 페이지들을 반환합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      wiki_id: z.string().describe("위키 ID"),
      parentPageId: z.string().optional().describe("상위 페이지 ID (null이면 최상위)"),
    },
  }, async ({ bind_token, wiki_id, parentPageId }) => {
    try {
      const data = await doorayFetch(bind_token, `/wiki/v1/wikis/${wiki_id}/pages`, {
        params: { parentPageId },
      });
      return okList(data as { result?: Array<{ id: string; subject?: string; parentPageId?: string; order?: number; createdAt?: string; updatedAt?: string }>; totalCount?: number }, (p) => ({
        id: p.id, subject: p.subject, parentPageId: p.parentPageId, order: p.order, createdAt: p.createdAt, updatedAt: p.updatedAt,
      }));
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("get_wiki_page", {
    description: "위키 페이지 상세를 조회합니다 (본문, 첨부파일 포함).",
    inputSchema: {
      bind_token: bindTokenSchema,
      wiki_id: z.string().describe("위키 ID"),
      page_id: z.string().describe("위키 페이지 ID"),
    },
  }, async ({ bind_token, wiki_id, page_id }) => {
    try {
      const data = await doorayFetch(bind_token, `/wiki/v1/wikis/${wiki_id}/pages/${page_id}`);
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("update_wiki_page", {
    description: "위키 페이지 제목+본문을 수정합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      wiki_id: z.string().describe("위키 ID"),
      page_id: z.string().describe("위키 페이지 ID"),
      subject: z.string().optional().describe("페이지 제목"),
      body: z.object({
        mimeType: z.string().optional().describe("본문 형식 (text/x-markdown)"),
        content: z.string().describe("본문 내용"),
      }).optional().describe("페이지 본문"),
      referrers: z.array(z.record(z.unknown())).optional().describe("참조자 목록 (null이면 기존 참조자 삭제)"),
    },
  }, async ({ bind_token, wiki_id, page_id, ...body }) => {
    try {
      const data = await doorayFetch(bind_token, `/wiki/v1/wikis/${wiki_id}/pages/${page_id}`, {
        method: "PUT",
        body,
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("update_wiki_page_title", {
    description: "위키 페이지 제목만 수정합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      wiki_id: z.string().describe("위키 ID"),
      page_id: z.string().describe("위키 페이지 ID"),
      subject: z.string().describe("새 페이지 제목"),
    },
  }, async ({ bind_token, wiki_id, page_id, subject }) => {
    try {
      const data = await doorayFetch(bind_token, `/wiki/v1/wikis/${wiki_id}/pages/${page_id}/title`, {
        method: "PUT",
        body: { subject },
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("update_wiki_page_content", {
    description: "위키 페이지 본문만 수정합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      wiki_id: z.string().describe("위키 ID"),
      page_id: z.string().describe("위키 페이지 ID"),
      body: z.object({
        mimeType: z.string().optional().describe("본문 형식 (text/x-markdown)"),
        content: z.string().describe("본문 내용"),
      }).describe("페이지 본문"),
    },
  }, async ({ bind_token, wiki_id, page_id, body: pageBody }) => {
    try {
      const data = await doorayFetch(bind_token, `/wiki/v1/wikis/${wiki_id}/pages/${page_id}/content`, {
        method: "PUT",
        body: { body: pageBody },
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("update_wiki_page_referrers", {
    description: "위키 페이지 참조자를 수정합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      wiki_id: z.string().describe("위키 ID"),
      page_id: z.string().describe("위키 페이지 ID"),
      referrers: z.array(z.record(z.unknown())).describe("참조자 목록"),
    },
  }, async ({ bind_token, wiki_id, page_id, referrers }) => {
    try {
      const data = await doorayFetch(bind_token, `/wiki/v1/wikis/${wiki_id}/pages/${page_id}/referrers`, {
        method: "PUT",
        body: { referrers },
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  // Comments
  server.registerTool("create_wiki_comment", {
    description: "위키 페이지에 댓글을 추가합니다 (마크다운 지원).",
    inputSchema: {
      bind_token: bindTokenSchema,
      wiki_id: z.string().describe("위키 ID"),
      page_id: z.string().describe("위키 페이지 ID"),
      content: z.string().describe("댓글 내용 (마크다운)"),
    },
  }, async ({ bind_token, wiki_id, page_id, content }) => {
    try {
      const data = await doorayFetch(bind_token, `/wiki/v1/wikis/${wiki_id}/pages/${page_id}/comments`, {
        method: "POST",
        body: { body: { content } },
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("list_wiki_comments", {
    description: "위키 페이지 댓글 목록을 조회합니다 (최신순).",
    inputSchema: {
      bind_token: bindTokenSchema,
      wiki_id: z.string().describe("위키 ID"),
      page_id: z.string().describe("위키 페이지 ID"),
      ...paginationSchema,
    },
  }, async ({ bind_token, wiki_id, page_id, page, size }) => {
    try {
      const data = await doorayFetch(bind_token, `/wiki/v1/wikis/${wiki_id}/pages/${page_id}/comments`, {
        params: { page, size },
      });
      return okList(data as { result?: Array<{ id: string; createdAt?: string; creator?: { member?: { organizationMemberId?: string } } }>; totalCount?: number }, (c) => ({
        id: c.id, createdAt: c.createdAt, creatorId: c.creator?.member?.organizationMemberId,
      }));
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("get_wiki_comment", {
    description: "위키 페이지 댓글 단건을 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      wiki_id: z.string().describe("위키 ID"),
      page_id: z.string().describe("위키 페이지 ID"),
      comment_id: z.string().describe("댓글 ID"),
    },
  }, async ({ bind_token, wiki_id, page_id, comment_id }) => {
    try {
      const data = await doorayFetch(bind_token, `/wiki/v1/wikis/${wiki_id}/pages/${page_id}/comments/${comment_id}`);
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("update_wiki_comment", {
    description: "위키 페이지 댓글을 수정합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      wiki_id: z.string().describe("위키 ID"),
      page_id: z.string().describe("위키 페이지 ID"),
      comment_id: z.string().describe("댓글 ID"),
      content: z.string().describe("수정할 댓글 내용"),
    },
  }, async ({ bind_token, wiki_id, page_id, comment_id, content }) => {
    try {
      const data = await doorayFetch(bind_token, `/wiki/v1/wikis/${wiki_id}/pages/${page_id}/comments/${comment_id}`, {
        method: "PUT",
        body: { body: { content } },
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("delete_wiki_comment", {
    description: "위키 페이지 댓글을 삭제합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      wiki_id: z.string().describe("위키 ID"),
      page_id: z.string().describe("위키 페이지 ID"),
      comment_id: z.string().describe("댓글 ID"),
    },
  }, async ({ bind_token, wiki_id, page_id, comment_id }) => {
    try {
      const data = await doorayFetch(bind_token, `/wiki/v1/wikis/${wiki_id}/pages/${page_id}/comments/${comment_id}`, {
        method: "DELETE",
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  // Shared Links
  server.registerTool("list_wiki_shared_links", {
    description: "위키 페이지의 공유 링크 목록을 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      wiki_id: z.string().describe("위키 ID"),
      page_id: z.string().describe("위키 페이지 ID"),
      valid: z.boolean().optional().describe("유효한 링크만 조회 (기본값 true)"),
      ...paginationSchema,
    },
  }, async ({ bind_token, wiki_id, page_id, valid, page, size }) => {
    try {
      const data = await doorayFetch(bind_token, `/wiki/v1/wikis/${wiki_id}/pages/${page_id}/shared-links`, {
        params: { valid, page, size },
      });
      return okList(data as { result?: Array<{ id: string; url?: string; createdAt?: string }>; totalCount?: number }, (l) => ({
        id: l.id, url: l.url, createdAt: l.createdAt,
      }));
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  // File management (no upload/download - requires multipart/307 redirect)
  server.registerTool("delete_wiki_page_file", {
    description: "위키 페이지 첨부 파일을 삭제합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      wiki_id: z.string().describe("위키 ID"),
      page_id: z.string().describe("위키 페이지 ID"),
      file_id: z.string().describe("파일 ID"),
    },
  }, async ({ bind_token, wiki_id, page_id, file_id }) => {
    try {
      const data = await doorayFetch(bind_token, `/wiki/v1/wikis/${wiki_id}/pages/${page_id}/files/${file_id}`, {
        method: "DELETE",
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });
}
