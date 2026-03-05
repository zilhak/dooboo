import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { doorayFetch } from "../client.ts";
import { ok, err, okList, bindTokenSchema, paginationSchema, filterSchema, type DoorayProject, type DoorayWorkflow, type DoorayTag, type DoorayMilestone, type DoorayProjectMember, type DoorayMemberGroup, type DoorayTemplate } from "../helpers.ts";

export function projectTools(server: McpServer) {
  server.registerTool("list_project_categories", {
    description: "프로젝트 카테고리 목록을 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      ...filterSchema,
    },
  }, async ({ bind_token, filter }) => {
    try {
      const data = await doorayFetch(bind_token, "/project/v1/project-categories");
      return okList(data as { result?: Array<{ id: string; name?: string }>; totalCount?: number }, (c) => ({
        id: c.id, name: c.name,
      }), filter);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("create_project", {
    description: "새 프로젝트를 생성합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      code: z.string().describe("프로젝트 코드"),
      description: z.string().optional().describe("프로젝트 설명"),
      scope: z.enum(["private", "public"]).describe("공개 범위"),
      projectCategoryId: z.string().optional().describe("카테고리 ID"),
    },
  }, async ({ bind_token, code, description, scope, projectCategoryId }) => {
    try {
      const data = await doorayFetch(bind_token, "/project/v1/projects", {
        method: "POST",
        body: { code, description, scope, projectCategoryId },
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("list_projects", {
    description: "프로젝트 목록을 조회합니다. 프로젝트는 업무(태스크), 드라이브, 위키를 포함하는 컨테이너입니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      member: z.string().optional().describe("멤버 필터 (기본: me)"),
      type: z.string().optional().describe("프로젝트 타입"),
      scope: z.string().optional().describe("공개 범위"),
      state: z.string().optional().describe("프로젝트 상태"),
      ...paginationSchema,
      ...filterSchema,
    },
  }, async ({ bind_token, filter, ...params }) => {
    try {
      const data = await doorayFetch(bind_token, "/project/v1/projects", {
        params: params as Record<string, string | number | undefined>,
      });
      return okList(data as { result?: DoorayProject[]; totalCount?: number }, (p) => ({
        id: p.id, code: p.code, name: p.name, description: p.description, state: p.state, scope: p.scope,
      }), filter);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("get_project", {
    description: "프로젝트 상세 정보를 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
    },
  }, async ({ bind_token, project_id }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}`);
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("check_project_creatable", {
    description: "프로젝트 생성 가능 여부를 확인합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      code: z.string().describe("확인할 프로젝트 코드"),
    },
  }, async ({ bind_token, code }) => {
    try {
      const data = await doorayFetch(bind_token, "/project/v1/projects/is-creatable", {
        method: "POST",
        body: { code },
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("list_task_workflows", {
    description: "프로젝트의 업무 워크플로우(진행 상태) 목록을 조회합니다. 워크플로우는 업무의 상태 흐름(할 일→진행 중→완료 등)을 정의합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      ...filterSchema,
    },
  }, async ({ bind_token, filter, project_id }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/workflows`);
      return okList(data as { result?: DoorayWorkflow[]; totalCount?: number }, (w) => ({
        id: w.id, name: w.name, class: w.class, order: w.order,
      }), filter);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("create_task_workflow", {
    description: "워크플로우를 생성합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      name: z.string().describe("워크플로우 이름"),
      order: z.number().describe("순서"),
      class: z.string().describe("워크플로우 클래스"),
      names: z.array(z.record(z.unknown())).optional().describe("다국어 이름 배열"),
    },
  }, async ({ bind_token, project_id, ...body }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/workflows`, {
        method: "POST",
        body,
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("update_task_workflow", {
    description: "워크플로우를 수정합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      workflow_id: z.string().describe("워크플로우 ID"),
      name: z.string().describe("워크플로우 이름"),
      order: z.number().describe("순서"),
      class: z.string().describe("워크플로우 클래스"),
      names: z.array(z.record(z.unknown())).optional().describe("다국어 이름 배열"),
    },
  }, async ({ bind_token, project_id, workflow_id, ...body }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/workflows/${workflow_id}`, {
        method: "PUT",
        body,
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("delete_task_workflow", {
    description: "워크플로우를 삭제합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      workflow_id: z.string().describe("삭제할 워크플로우 ID"),
      toBeWorkflowId: z.string().describe("대체 워크플로우 ID"),
    },
  }, async ({ bind_token, project_id, workflow_id, toBeWorkflowId }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/workflows/${workflow_id}/delete`, {
        method: "POST",
        body: { toBeWorkflowId },
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("create_email_address", {
    description: "프로젝트 이메일 주소를 생성합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      emailAddress: z.string().describe("이메일 주소"),
      name: z.string().describe("이름"),
    },
  }, async ({ bind_token, project_id, emailAddress, name }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/email-addresses`, {
        method: "POST",
        body: { emailAddress, name },
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("get_email_address", {
    description: "프로젝트 이메일 주소를 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      email_address_id: z.string().describe("이메일 주소 ID"),
    },
  }, async ({ bind_token, project_id, email_address_id }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/email-addresses/${email_address_id}`);
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("create_project_tag", {
    description: "프로젝트 태그를 생성합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      name: z.string().describe("태그 이름"),
      color: z.string().describe("태그 색상"),
    },
  }, async ({ bind_token, project_id, name, color }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/tags`, {
        method: "POST",
        body: { name, color },
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("list_project_tags", {
    description: "프로젝트 태그 목록을 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      ...paginationSchema,
      ...filterSchema,
    },
  }, async ({ bind_token, filter, project_id, page, size }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/tags`, {
        params: { page, size },
      });
      return okList(data as { result?: DoorayTag[]; totalCount?: number }, (t) => ({
        id: t.id, name: t.name, color: t.color,
      }), filter);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("get_project_tag", {
    description: "프로젝트 태그 상세를 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      tag_id: z.string().describe("태그 ID"),
    },
  }, async ({ bind_token, project_id, tag_id }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/tags/${tag_id}`);
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("update_project_tag_group", {
    description: "태그 그룹 설정을 수정합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      tag_group_id: z.string().describe("태그 그룹 ID"),
      mandatory: z.boolean().describe("필수 여부"),
      selectOne: z.boolean().describe("단일 선택 여부"),
    },
  }, async ({ bind_token, project_id, tag_group_id, mandatory, selectOne }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/tag-groups/${tag_group_id}`, {
        method: "PUT",
        body: { mandatory, selectOne },
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("create_project_milestone", {
    description: "마일스톤을 생성합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      name: z.string().describe("마일스톤 이름"),
      startedAt: z.string().describe("시작일 (ISO8601)"),
      endedAt: z.string().describe("종료일 (ISO8601)"),
    },
  }, async ({ bind_token, project_id, name, startedAt, endedAt }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/milestones`, {
        method: "POST",
        body: { name, startedAt, endedAt },
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("list_project_milestones", {
    description: "마일스톤 목록을 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      status: z.string().optional().describe("마일스톤 상태"),
      ...paginationSchema,
      ...filterSchema,
    },
  }, async ({ bind_token, filter, project_id, status, page, size }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/milestones`, {
        params: { status, page, size },
      });
      return okList(data as { result?: DoorayMilestone[]; totalCount?: number }, (m) => ({
        id: m.id, name: m.name, startedAt: m.startedAt, endedAt: m.endedAt, status: m.status,
      }), filter);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("get_project_milestone", {
    description: "마일스톤 상세를 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      milestone_id: z.string().describe("마일스톤 ID"),
    },
  }, async ({ bind_token, project_id, milestone_id }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/milestones/${milestone_id}`);
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("update_project_milestone", {
    description: "마일스톤을 수정합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      milestone_id: z.string().describe("마일스톤 ID"),
      name: z.string().optional().describe("마일스톤 이름"),
      status: z.string().optional().describe("상태"),
      startedAt: z.string().optional().describe("시작일"),
      endedAt: z.string().optional().describe("종료일"),
    },
  }, async ({ bind_token, project_id, milestone_id, ...body }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/milestones/${milestone_id}`, {
        method: "PUT",
        body,
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("delete_project_milestone", {
    description: "마일스톤을 삭제합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      milestone_id: z.string().describe("마일스톤 ID"),
    },
  }, async ({ bind_token, project_id, milestone_id }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/milestones/${milestone_id}`, {
        method: "DELETE",
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("create_project_hook", {
    description: "프로젝트 웹훅을 생성합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      url: z.string().describe("웹훅 URL"),
      type: z.string().optional().describe("웹훅 타입"),
      sendEvents: z.array(z.string()).describe("전송할 이벤트 목록"),
      option: z.record(z.unknown()).optional().describe("추가 옵션"),
    },
  }, async ({ bind_token, project_id, ...body }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/hooks`, {
        method: "POST",
        body,
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("add_project_member", {
    description: "프로젝트 멤버를 추가합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      organizationMemberId: z.string().describe("조직 멤버 ID"),
      role: z.string().describe("역할"),
    },
  }, async ({ bind_token, project_id, organizationMemberId, role }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/members`, {
        method: "POST",
        body: { organizationMemberId, role },
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("list_project_members", {
    description: "프로젝트 멤버 목록을 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      roles: z.string().optional().describe("역할 필터"),
      ...paginationSchema,
      ...filterSchema,
    },
  }, async ({ bind_token, filter, project_id, roles, page, size }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/members`, {
        params: { roles, page, size },
      });
      return okList(data as { result?: DoorayProjectMember[]; totalCount?: number }, (m) => ({
        organizationMemberId: m.member?.organizationMemberId ?? m.organizationMemberId,
        name: m.member?.name ?? m.name,
        role: m.role,
      }), filter);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("get_project_member", {
    description: "프로젝트 멤버 상세를 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      member_id: z.string().describe("멤버 ID"),
    },
  }, async ({ bind_token, project_id, member_id }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/members/${member_id}`);
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("list_member_groups", {
    description: "프로젝트 멤버 그룹 목록을 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      ...paginationSchema,
      ...filterSchema,
    },
  }, async ({ bind_token, filter, project_id, page, size }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/member-groups`, {
        params: { page, size },
      });
      return okList(data as { result?: DoorayMemberGroup[]; totalCount?: number }, (g) => ({
        id: g.id, name: g.name, memberCount: g.memberCount,
      }), filter);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("get_member_group", {
    description: "프로젝트 멤버 그룹 상세를 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      member_group_id: z.string().describe("멤버 그룹 ID"),
    },
  }, async ({ bind_token, project_id, member_group_id }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/member-groups/${member_group_id}`);
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("create_task_template", {
    description: "업무 템플릿을 생성합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      templateName: z.string().describe("템플릿 이름"),
      subject: z.string().optional().describe("제목"),
      body: z.record(z.unknown()).optional().describe("본문"),
      guide: z.record(z.unknown()).optional().describe("가이드"),
      users: z.record(z.unknown()).optional().describe("담당자 목록"),
      dueDate: z.string().optional().describe("마감일"),
      dueDateFlag: z.boolean().optional().describe("마감일 플래그"),
      milestoneId: z.string().optional().describe("마일스톤 ID"),
      tagIds: z.array(z.string()).optional().describe("태그 ID 목록"),
      priority: z.string().optional().describe("우선순위"),
      isDefault: z.boolean().optional().describe("기본 템플릿 여부"),
    },
  }, async ({ bind_token, project_id, ...body }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/templates`, {
        method: "POST",
        body,
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("list_task_templates", {
    description: "업무 템플릿 목록을 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      ...paginationSchema,
      ...filterSchema,
    },
  }, async ({ bind_token, filter, project_id, page, size }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/templates`, {
        params: { page, size },
      });
      return okList(data as { result?: DoorayTemplate[]; totalCount?: number }, (t) => ({
        id: t.id, name: t.templateName ?? t.name,
      }), filter);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("get_task_template", {
    description: "업무 템플릿 상세를 조회합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      template_id: z.string().describe("템플릿 ID"),
      interpolation: z.boolean().optional().describe("변수 치환 여부"),
    },
  }, async ({ bind_token, project_id, template_id, interpolation }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/templates/${template_id}`, {
        params: { interpolation },
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("update_task_template", {
    description: "업무 템플릿을 수정합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      template_id: z.string().describe("템플릿 ID"),
      templateName: z.string().describe("템플릿 이름"),
      subject: z.string().optional().describe("제목"),
      body: z.record(z.unknown()).optional().describe("본문"),
      guide: z.record(z.unknown()).optional().describe("가이드"),
      users: z.record(z.unknown()).optional().describe("담당자 목록"),
      dueDate: z.string().optional().describe("마감일"),
      dueDateFlag: z.boolean().optional().describe("마감일 플래그"),
      milestoneId: z.string().optional().describe("마일스톤 ID"),
      tagIds: z.array(z.string()).optional().describe("태그 ID 목록"),
      priority: z.string().optional().describe("우선순위"),
      isDefault: z.boolean().optional().describe("기본 템플릿 여부"),
    },
  }, async ({ bind_token, project_id, template_id, ...body }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/templates/${template_id}`, {
        method: "PUT",
        body,
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool("delete_task_template", {
    description: "업무 템플릿을 삭제합니다.",
    inputSchema: {
      bind_token: bindTokenSchema,
      project_id: z.string().describe("프로젝트 ID"),
      template_id: z.string().describe("템플릿 ID"),
    },
  }, async ({ bind_token, project_id, template_id }) => {
    try {
      const data = await doorayFetch(bind_token, `/project/v1/projects/${project_id}/templates/${template_id}`, {
        method: "DELETE",
      });
      return ok(data);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });
}
