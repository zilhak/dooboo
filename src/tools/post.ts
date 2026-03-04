import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { doorayFetch, doorayDownload } from "../client.ts";
import { DATA_DIR } from "../db.ts";
import { join } from "node:path";
import { ok, err, okList, bindTokenSchema, paginationSchema, type DoorayTask, type DoorayFile, type DoorayComment } from "../helpers.ts";

export function postTools(server: McpServer) {
  server.registerTool("find_task_by_ticket", {
    description: "티켓 번호(예: 'CONE-Chain-Portal/272')로 업무를 바로 조회합니다. include 옵션으로 본문(body), 댓글(comments), 이미지 다운로드(images)를 함께 조회할 수 있습니다. images를 지정하면 본문/댓글의 이미지를 ~/.dooboo/images/에 다운로드하고, 마크다운 내 경로를 로컬 파일 경로로 치환하여 반환합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      ticket: z.string().describe("티켓 번호 (예: CONE-Chain-Portal/272)"),
      include: z.array(z.enum(["body", "comments", "images"])).optional().describe("추가 조회 항목. body: 본문+첨부파일 상세, comments: 댓글 목록, images: 이미지 다운로드+경로 치환 (body 자동 포함)"),
    },
  }, async ({ bind_token, ticket, include }) => {
    try {
      const slashIdx = ticket.lastIndexOf("/");
      if (slashIdx === -1) {
        return err("티켓 번호 형식이 올바르지 않습니다. '프로젝트코드/번호' 형식으로 입력하세요. (예: CONE-Chain-Portal/272)");
      }
      const projectCode = ticket.substring(0, slashIdx);
      const postNumber = ticket.substring(slashIdx + 1);
      const includeSet = new Set(include ?? []);

      // images를 쓰려면 body가 필요
      if (includeSet.has("images")) {
        includeSet.add("body");
        includeSet.add("comments");
      }

      // 1. 프로젝트 코드로 프로젝트 ID 찾기
      let projectId: string | null = null;
      let page = 0;
      while (!projectId) {
        const projects = await doorayFetch(bind_token, "/project/v1/projects", {
          params: { page, size: 100 },
        });
        const results = projects.result as Array<{ id: string; code: string }>;
        if (!results || results.length === 0) break;
        const found = results.find((p) => p.code === projectCode);
        if (found) {
          projectId = found.id;
        } else {
          page++;
        }
      }

      if (!projectId) {
        return err(`프로젝트를 찾을 수 없습니다: ${projectCode}`);
      }

      // 2. 업무 번호로 업무 조회
      const listData = await doorayFetch(bind_token, `/project/v1/projects/${projectId}/posts`, {
        params: { postNumber },
      });
      const tasks = listData.result as Array<{ id: string }>;
      if (!tasks || tasks.length === 0) {
        return err(`업무를 찾을 수 없습니다: ${ticket}`);
      }

      const postId = tasks[0].id;
      const result: Record<string, unknown> = { _projectId: projectId };

      // 3. body 포함 시: 상세 조회 (본문 + 첨부파일 메타)
      if (includeSet.has("body")) {
        const detail = await doorayFetch(bind_token, `/project/v1/projects/${projectId}/posts/${postId}`);
        result.task = detail.result;
      } else {
        result.task = tasks[0];
      }

      // 4. comments 포함 시: 댓글 목록 조회
      if (includeSet.has("comments")) {
        const comments = await doorayFetch(bind_token, `/project/v1/projects/${projectId}/posts/${postId}/logs`, {
          params: { size: 100 },
        });
        result.comments = comments.result;
      }

      // 5. images 포함 시: 이미지 다운로드 + 마크다운 경로 치환
      if (includeSet.has("images")) {
        const { readdirSync, statSync, unlinkSync, existsSync, mkdirSync } = await import("node:fs");

        const imagesDir = join(DATA_DIR, "images");
        if (!existsSync(imagesDir)) {
          mkdirSync(imagesDir, { recursive: true });
        }

        // 용량 체크 및 정리
        const MAX_SIZE = 50 * 1024 * 1024;
        const TARGET_SIZE = 40 * 1024 * 1024;
        const scanFiles = (dir: string): Array<{ path: string; size: number; mtimeMs: number }> => {
          const files: Array<{ path: string; size: number; mtimeMs: number }> = [];
          if (!existsSync(dir)) return files;
          for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const fullPath = join(dir, entry.name);
            if (entry.isDirectory()) {
              files.push(...scanFiles(fullPath));
            } else {
              const stat = statSync(fullPath);
              files.push({ path: fullPath, size: stat.size, mtimeMs: stat.mtimeMs });
            }
          }
          return files;
        };

        let cachedFiles = scanFiles(imagesDir);
        let totalSize = cachedFiles.reduce((sum, f) => sum + f.size, 0);
        if (totalSize > MAX_SIZE) {
          cachedFiles.sort((a, b) => a.mtimeMs - b.mtimeMs);
          for (const f of cachedFiles) {
            if (totalSize <= TARGET_SIZE) break;
            unlinkSync(f.path);
            totalSize -= f.size;
          }
        }

        // 본문+댓글에서 /files/{id} 패턴의 file ID를 출처별로 수집
        const task = result.task as Record<string, unknown>;
        const taskBody = task?.body as { content?: string; _images?: unknown[] } | undefined;
        const commentsArr = result.comments as Array<{ id?: string; body?: { content?: string; _images?: unknown[] } }> | undefined;

        const fileIds = new Set<string>();
        const bodyFileIds = new Set<string>();
        const commentFileIdsMap = new Map<number, Set<string>>();

        const extractFileIds = (content: string): Set<string> => {
          const ids = new Set<string>();
          let match;
          const regex = /\/files\/(\d+)/g;
          while ((match = regex.exec(content)) !== null) {
            ids.add(match[1]);
            fileIds.add(match[1]);
          }
          return ids;
        };

        if (taskBody?.content) {
          for (const id of extractFileIds(taskBody.content)) {
            bodyFileIds.add(id);
          }
        }
        if (commentsArr) {
          for (let i = 0; i < commentsArr.length; i++) {
            if (commentsArr[i].body?.content) {
              commentFileIdsMap.set(i, extractFileIds(commentsArr[i].body!.content!));
            }
          }
        }

        // 파일 메타에서 이름·사이즈 매핑
        const taskFiles = (task?.files as Array<{ id: string; name: string; size?: number }>) ?? [];
        const fileMetaMap = new Map<string, { name: string; size?: number }>();
        for (const f of taskFiles) {
          fileMetaMap.set(f.id, { name: f.name, size: f.size });
        }

        // 다운로드 및 경로 매핑
        const pathMap: Record<string, string> = {};
        const saveDir = join(imagesDir, projectId, postId);

        for (const fileId of fileIds) {
          const meta = fileMetaMap.get(fileId);
          const fileName = meta?.name ?? fileId;
          const savePath = join(saveDir, fileName);
          try {
            const apiPath = `/project/v1/projects/${projectId}/posts/${postId}/files/${fileId}?media=raw`;
            await doorayDownload(bind_token, apiPath, savePath);
            pathMap[fileId] = savePath;
          } catch {
            // 다운로드 실패한 파일은 건너뜀
          }
        }

        // 마크다운 내 /files/{id} → 로컬 경로 치환
        const replaceFilePaths = (content: string): string => {
          return content.replace(/\/files\/(\d+)/g, (_, id) => pathMap[id] ?? `/files/${id}`);
        };

        // 출처별 _images 배열 생성 헬퍼
        const buildImageList = (ids: Set<string>) =>
          [...ids].filter(id => pathMap[id]).map(id => {
            const meta = fileMetaMap.get(id);
            return { fileId: id, name: meta?.name ?? id, size: meta?.size, localPath: pathMap[id] };
          });

        if (taskBody?.content) {
          taskBody.content = replaceFilePaths(taskBody.content);
          taskBody._images = buildImageList(bodyFileIds);
        }
        if (commentsArr) {
          for (let i = 0; i < commentsArr.length; i++) {
            if (commentsArr[i].body?.content) {
              commentsArr[i].body!.content = replaceFilePaths(commentsArr[i].body!.content!);
              commentsArr[i].body!._images = buildImageList(commentFileIdsMap.get(i) ?? new Set());
            }
          }
        }

        result._downloadedImages = pathMap;
      }

      return ok(result);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("get_task_by_id", {
    description: "업무(태스크) ID로 업무를 직접 조회합니다. Dooray API에서 업무는 'post'로 표현됩니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      post_id: z.string().describe("업무 ID (post ID)"),
    },
  }, async ({ bind_token, post_id }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/posts/${post_id}`);
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("create_task_draft", {
    description: "업무 임시저장(초안)을 생성합니다.",
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

  server.registerTool("create_task", {
    description: "프로젝트에 새 업무(태스크)를 생성합니다. Jira의 이슈 생성과 유사합니다. 담당자, 마감일, 태그, 우선순위 등을 설정할 수 있습니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      subject: z.string().describe("제목"),
      parentPostId: z.string().optional().describe("부모 업무 ID"),
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

  server.registerTool("list_tasks", {
    description: "프로젝트 내 업무(태스크) 목록을 조회합니다. 담당자, 태그, 워크플로우 상태 등으로 필터링할 수 있습니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      fromMemberIds: z.string().optional().describe("작성자 멤버 ID"),
      toMemberIds: z.string().optional().describe("담당자 멤버 ID"),
      ccMemberIds: z.string().optional().describe("참조 멤버 ID"),
      tagIds: z.string().optional().describe("태그 ID"),
      parentPostId: z.string().optional().describe("부모 업무 ID"),
      postNumber: z.string().optional().describe("업무 번호"),
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
      return okList(data as { result?: DoorayTask[]; totalCount?: number }, (t) => ({
        taskNumber: t.taskNumber,
        subject: t.subject,
        priority: t.priority,
        workflowClass: t.workflowClass,
        workflow: t.workflow?.name,
        milestone: t.milestone?.name,
        from: t.users?.from?.member?.name,
        to: t.users?.to?.map((u) => u.member?.name),
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        closed: t.closed,
        fileCount: t.fileIdList?.length ?? 0,
      }));
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("get_task", {
    description: "프로젝트 내 특정 업무(태스크)를 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      post_id: z.string().describe("업무 ID (post ID)"),
    },
  }, async ({ bind_token, project_id, post_id }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/posts/${post_id}`);
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("update_task", {
    description: "업무(태스크)를 수정합니다. 제목, 담당자, 본문, 마감일, 태그, 우선순위 등을 변경할 수 있습니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      post_id: z.string().describe("업무 ID (post ID)"),
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

  server.registerTool("update_task_assignee_workflow", {
    description: "업무의 특정 담당자에 대한 워크플로우(진행 상태)를 변경합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      post_id: z.string().describe("업무 ID (post ID)"),
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

  server.registerTool("set_task_workflow", {
    description: "업무의 워크플로우(진행 상태)를 모든 담당자에 대해 일괄 변경합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      post_id: z.string().describe("업무 ID (post ID)"),
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

  server.registerTool("set_task_done", {
    description: "업무를 완료 처리합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      post_id: z.string().describe("업무 ID (post ID)"),
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

  server.registerTool("set_task_parent", {
    description: "업무의 부모 업무를 설정합니다 (하위 업무 구조 생성).",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      post_id: z.string().describe("업무 ID (post ID)"),
      parentPostId: z.string().describe("부모 업무 ID"),
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

  server.registerTool("move_task", {
    description: "업무를 다른 프로젝트로 이동합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      post_id: z.string().describe("업무 ID (post ID)"),
      targetProjectId: z.string().optional().describe("대상 프로젝트 ID"),
      includeSubPosts: z.boolean().optional().describe("하위 업무 포함 여부"),
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

  server.registerTool("list_task_files", {
    description: "업무 첨부파일 목록을 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      post_id: z.string().describe("업무 ID (post ID)"),
    },
  }, async ({ bind_token, project_id, post_id }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/posts/${post_id}/files`);
      return okList(data as { result?: DoorayFile[]; totalCount?: number }, (f) => ({
        id: f.id, name: f.name, size: f.size,
      }));
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("get_task_file_meta", {
    description: "업무 첨부파일 메타데이터를 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      post_id: z.string().describe("업무 ID (post ID)"),
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

  server.registerTool("download_file", {
    description: "Dooray 파일을 다운로드하여 ~/.dooboo/images/ 에 저장합니다. API 경로를 직접 지정합니다 (?media=raw 자동 추가). 다운로드 시작 전 폴더 용량이 50MB를 초과하면 오래된 파일부터 삭제하여 40MB 이하로 정리한 후 다운로드합니다. 업무 파일: /project/v1/projects/{pid}/posts/{postId}/files/{fileId}, 드라이브 파일: /drive/v1/drives/{driveId}/files/{fileId}",
    inputSchema: {
      bind_token: bindTokenSchema,
      path: z.string().describe("파일 API 경로 (예: /project/v1/projects/{pid}/posts/{postId}/files/{fileId})"),
      filename: z.string().describe("저장할 파일명"),
    },
  }, async ({ bind_token, path, filename }) => {
    try {
      const { readdirSync, statSync, unlinkSync, existsSync, mkdirSync } = await import("node:fs");

      const imagesDir = join(DATA_DIR, "images");
      if (!existsSync(imagesDir)) {
        mkdirSync(imagesDir, { recursive: true });
      }

      // 용량 체크 및 정리 (50MB 초과 시 40MB 이하로)
      const MAX_SIZE = 50 * 1024 * 1024;
      const TARGET_SIZE = 40 * 1024 * 1024;

      const getFiles = () => {
        const files: Array<{ path: string; size: number; mtimeMs: number }> = [];
        const scan = (dir: string) => {
          for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const fullPath = join(dir, entry.name);
            if (entry.isDirectory()) {
              scan(fullPath);
            } else {
              const stat = statSync(fullPath);
              files.push({ path: fullPath, size: stat.size, mtimeMs: stat.mtimeMs });
            }
          }
        };
        scan(imagesDir);
        return files;
      };

      let files = getFiles();
      let totalSize = files.reduce((sum, f) => sum + f.size, 0);

      if (totalSize > MAX_SIZE) {
        files.sort((a, b) => a.mtimeMs - b.mtimeMs);
        for (const f of files) {
          if (totalSize <= TARGET_SIZE) break;
          unlinkSync(f.path);
          totalSize -= f.size;
        }
      }

      const separator = path.includes("?") ? "&" : "?";
      const apiPath = `${path}${separator}media=raw`;
      const savePath = join(imagesDir, filename);
      const saved = await doorayDownload(bind_token, apiPath, savePath);
      return ok({ message: "다운로드 완료", path: saved });
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("delete_task_file", {
    description: "업무 첨부파일을 삭제합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      post_id: z.string().describe("업무 ID (post ID)"),
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

  server.registerTool("create_task_comment", {
    description: "업무에 댓글을 작성합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      post_id: z.string().describe("업무 ID (post ID)"),
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

  server.registerTool("list_task_comments", {
    description: "업무 댓글 목록을 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      post_id: z.string().describe("업무 ID (post ID)"),
      order: z.string().optional().describe("정렬 순서"),
      ...paginationSchema,
    },
  }, async ({ bind_token, project_id, post_id, order, page, size }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/posts/${post_id}/logs`, {
        params: { order, page, size },
      });
      return okList(data as { result?: DoorayComment[]; totalCount?: number }, (c) => ({
        id: c.id, type: c.type, subtype: c.subtype,
        createdAt: c.createdAt,
        creatorId: c.creator?.member?.organizationMemberId,
      }));
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("get_task_comment", {
    description: "업무 댓글을 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      post_id: z.string().describe("업무 ID (post ID)"),
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

  server.registerTool("update_task_comment", {
    description: "업무 댓글을 수정합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      post_id: z.string().describe("업무 ID (post ID)"),
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

  server.registerTool("delete_task_comment", {
    description: "업무 댓글을 삭제합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      post_id: z.string().describe("업무 ID (post ID)"),
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
