import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { doorayFetch } from "../client.ts";
import { ok, err, bindTokenSchema, paginationSchema } from "../helpers.ts";

export function postTools(server: McpServer) {
  server.registerTool("get_post_by_id", {
    description: "포스트 ID로 포스트를 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      post_id: z.string().describe("포스트 ID"),
    },
  }, async ({ bind_token, post_id }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/posts/${post_id}`);
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("create_post_draft", {
    description: "포스트 임시저장을 생성합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      projectId: z.string().describe("프로젝트 ID"),
      subject: z.string().describe("제목"),
      users: z.record(z.unknown()).optional().describe("담당자 정보"),
      body: z.object({
        mimeType: z.string().optional(),
        content: z.string(),
      }).optional().describe("본문"),
      dueDate: z.string().optional().describe("마감일"),
      dueDateFlag: z.boolean().optional().describe("마감일 플래그"),
      milestoneId: z.string().optional().describe("마일스톤 ID"),
      tagIds: z.array(z.string()).optional().describe("태그 ID 목록"),
      priority: z.string().optional().describe("우선순위"),
    },
  }, async ({ bind_token, ...body }) => {
    try {
      const data = await doorayFetch(bind_token, "/project/v1/post-drafts", {
        method: "POST",
        body,
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("create_post", {
    description: "포스트(업무)를 생성합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      subject: z.string().describe("제목"),
      parentPostId: z.string().optional().describe("부모 포스트 ID"),
      users: z.record(z.unknown()).optional().describe("담당자 정보"),
      body: z.object({
        mimeType: z.string().optional(),
        content: z.string(),
      }).optional().describe("본문"),
      dueDate: z.string().optional().describe("마감일"),
      dueDateFlag: z.boolean().optional().describe("마감일 플래그"),
      milestoneId: z.string().optional().describe("마일스톤 ID"),
      tagIds: z.array(z.string()).optional().describe("태그 ID 목록"),
      priority: z.string().optional().describe("우선순위"),
    },
  }, async ({ bind_token, project_id, ...body }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/posts`, {
        method: "POST",
        body,
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("list_posts", {
    description: "프로젝트 내 포스트 목록을 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      fromMemberIds: z.string().optional().describe("작성자 멤버 ID"),
      toMemberIds: z.string().optional().describe("담당자 멤버 ID"),
      ccMemberIds: z.string().optional().describe("참조 멤버 ID"),
      tagIds: z.string().optional().describe("태그 ID"),
      parentPostId: z.string().optional().describe("부모 포스트 ID"),
      postNumber: z.string().optional().describe("포스트 번호"),
      postWorkflowClasses: z.string().optional().describe("워크플로우 클래스"),
      postWorkflowIds: z.string().optional().describe("워크플로우 ID"),
      milestoneIds: z.string().optional().describe("마일스톤 ID"),
      subjects: z.string().optional().describe("제목 검색"),
      createdAt: z.string().optional().describe("생성일 범위"),
      updatedAt: z.string().optional().describe("수정일 범위"),
      dueAt: z.string().optional().describe("마감일 범위"),
      order: z.string().optional().describe("정렬 순서"),
      ...paginationSchema,
    },
  }, async ({ bind_token, project_id, ...params }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/posts`, {
        params: params as Record<string, string | number | undefined>,
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("get_post", {
    description: "프로젝트 내 특정 포스트를 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      post_id: z.string().describe("포스트 ID"),
    },
  }, async ({ bind_token, project_id, post_id }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/posts/${post_id}`);
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("update_post", {
    description: "포스트를 수정합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      post_id: z.string().describe("포스트 ID"),
      subject: z.string().optional().describe("제목"),
      users: z.record(z.unknown()).optional().describe("담당자 정보"),
      body: z.object({
        mimeType: z.string().optional(),
        content: z.string(),
      }).optional().describe("본문"),
      version: z.number().optional().describe("버전"),
      dueDate: z.string().optional().describe("마감일"),
      dueDateFlag: z.boolean().optional().describe("마감일 플래그"),
      milestoneId: z.string().optional().describe("마일스톤 ID"),
      tagIds: z.array(z.string()).optional().describe("태그 ID 목록"),
      priority: z.string().optional().describe("우선순위"),
    },
  }, async ({ bind_token, project_id, post_id, ...body }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/posts/${post_id}`, {
        method: "PUT",
        body,
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("update_post_assignee_workflow", {
    description: "포스트 담당자별 워크플로우를 변경합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      post_id: z.string().describe("포스트 ID"),
      organization_member_id: z.string().describe("조직 멤버 ID"),
      workflowId: z.string().describe("워크플로우 ID"),
    },
  }, async ({ bind_token, project_id, post_id, organization_member_id, workflowId }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/posts/${post_id}/to/${organization_member_id}`, {
        method: "PUT",
        body: { workflowId },
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("set_post_workflow", {
    description: "포스트 워크플로우를 일괄 변경합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      post_id: z.string().describe("포스트 ID"),
      workflowId: z.string().describe("워크플로우 ID"),
    },
  }, async ({ bind_token, project_id, post_id, workflowId }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/posts/${post_id}/set-workflow`, {
        method: "POST",
        body: { workflowId },
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("set_post_done", {
    description: "포스트를 완료 처리합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      post_id: z.string().describe("포스트 ID"),
    },
  }, async ({ bind_token, project_id, post_id }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/posts/${post_id}/set-done`, {
        method: "POST",
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("set_post_parent", {
    description: "포스트의 부모를 설정합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      post_id: z.string().describe("포스트 ID"),
      parentPostId: z.string().describe("부모 포스트 ID"),
    },
  }, async ({ bind_token, project_id, post_id, parentPostId }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/posts/${post_id}/set-parent-post`, {
        method: "POST",
        body: { parentPostId },
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("move_post", {
    description: "포스트를 다른 프로젝트로 이동합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      post_id: z.string().describe("포스트 ID"),
      targetProjectId: z.string().optional().describe("대상 프로젝트 ID"),
      includeSubPosts: z.boolean().optional().describe("하위 포스트 포함 여부"),
    },
  }, async ({ bind_token, project_id, post_id, targetProjectId, includeSubPosts }) => {
    try {
      const body: Record<string, unknown> = {};
      if (targetProjectId) body.targetProjectId = targetProjectId;
      if (includeSubPosts !== undefined) body.includeSubPosts = includeSubPosts;
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/posts/${post_id}/move`, {
        method: "POST",
        body,
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("list_post_files", {
    description: "포스트 첨부파일 목록을 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      post_id: z.string().describe("포스트 ID"),
    },
  }, async ({ bind_token, project_id, post_id }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/posts/${post_id}/files`);
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("get_post_file_meta", {
    description: "포스트 첨부파일 메타데이터를 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      post_id: z.string().describe("포스트 ID"),
      file_id: z.string().describe("파일 ID"),
    },
  }, async ({ bind_token, project_id, post_id, file_id }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/posts/${post_id}/files/${file_id}`, {
        params: { media: "meta" },
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("delete_post_file", {
    description: "포스트 첨부파일을 삭제합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      post_id: z.string().describe("포스트 ID"),
      file_id: z.string().describe("파일 ID"),
    },
  }, async ({ bind_token, project_id, post_id, file_id }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/posts/${post_id}/files/${file_id}`, {
        method: "DELETE",
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("create_post_comment", {
    description: "포스트 댓글을 생성합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      post_id: z.string().describe("포스트 ID"),
      content: z.string().describe("댓글 내용"),
      mimeType: z.string().optional().describe("MIME 타입 (기본: text/x-markdown)"),
      attachFileIds: z.array(z.string()).optional().describe("첨부파일 ID 목록"),
    },
  }, async ({ bind_token, project_id, post_id, content, mimeType, attachFileIds }) => {
    try {
      const body: Record<string, unknown> = {
        body: { content, mimeType: mimeType ?? "text/x-markdown" },
      };
      if (attachFileIds) body.attachFileIds = attachFileIds;
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/posts/${post_id}/logs`, {
        method: "POST",
        body,
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("list_post_comments", {
    description: "포스트 댓글 목록을 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      post_id: z.string().describe("포스트 ID"),
      order: z.string().optional().describe("정렬 순서"),
      ...paginationSchema,
    },
  }, async ({ bind_token, project_id, post_id, order, page, size }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/posts/${post_id}/logs`, {
        params: { order, page, size },
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("get_post_comment", {
    description: "포스트 댓글을 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      post_id: z.string().describe("포스트 ID"),
      log_id: z.string().describe("로그(댓글) ID"),
    },
  }, async ({ bind_token, project_id, post_id, log_id }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/posts/${post_id}/logs/${log_id}`);
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("update_post_comment", {
    description: "포스트 댓글을 수정합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      post_id: z.string().describe("포스트 ID"),
      log_id: z.string().describe("로그(댓글) ID"),
      content: z.string().describe("댓글 내용"),
      mimeType: z.string().optional().describe("MIME 타입"),
      attachFileIds: z.array(z.string()).optional().describe("첨부파일 ID 목록"),
    },
  }, async ({ bind_token, project_id, post_id, log_id, content, mimeType, attachFileIds }) => {
    try {
      const body: Record<string, unknown> = {
        body: { content, mimeType: mimeType ?? "text/x-markdown" },
      };
      if (attachFileIds) body.attachFileIds = attachFileIds;
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/posts/${post_id}/logs/${log_id}`, {
        method: "PUT",
        body,
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("delete_post_comment", {
    description: "포스트 댓글을 삭제합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      post_id: z.string().describe("포스트 ID"),
      log_id: z.string().describe("로그(댓글) ID"),
    },
  }, async ({ bind_token, project_id, post_id, log_id }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/posts/${post_id}/logs/${log_id}`, {
        method: "DELETE",
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });
}
