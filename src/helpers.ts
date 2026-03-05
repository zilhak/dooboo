import { z } from "zod";

// Dooray API 공용 타입
export interface DoorayResponse<T = unknown> {
  header?: { resultCode: number; resultMessage: string; isSuccessful: boolean };
  result?: T[];
  totalCount?: number;
}

export interface DoorayMember {
  type?: string;
  member?: { organizationMemberId?: string; name?: string };
  workflow?: { id?: string; name?: string };
}

export interface DoorayTask {
  id: string;
  number?: number;
  taskNumber?: string;
  subject?: string;
  priority?: string;
  workflowClass?: string;
  workflow?: { id?: string; name?: string };
  milestone?: { id?: string; name?: string; closedAt?: string | null } | null;
  users?: { from?: DoorayMember; to?: DoorayMember[]; cc?: DoorayMember[] };
  tags?: Array<{ id: string }>;
  createdAt?: string;
  updatedAt?: string;
  closed?: boolean;
  fileIdList?: string[];
}

export interface DoorayFile {
  id: string;
  name?: string;
  size?: number;
  mimeType?: string;
  type?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DoorayComment {
  id: string;
  type?: string;
  subtype?: string;
  createdAt?: string;
  creator?: { type?: string; member?: { organizationMemberId?: string } };
}

export interface DoorayProject {
  id: string;
  code?: string;
  name?: string;
  description?: string;
  state?: string;
  scope?: string;
}

export interface DoorayWorkflow {
  id: string;
  name?: string;
  class?: string;
  order?: number;
}

export interface DoorayTag {
  id: string;
  name?: string;
  color?: string;
}

export interface DoorayMilestone {
  id: string;
  name?: string;
  startedAt?: string;
  endedAt?: string;
  status?: string;
  closedAt?: string | null;
}

export interface DoorayProjectMember {
  organizationMemberId?: string;
  name?: string;
  role?: string;
  member?: { organizationMemberId?: string; name?: string };
}

export interface DoorayMemberGroup {
  id: string;
  name?: string;
  memberCount?: number;
}

export interface DoorayTemplate {
  id: string;
  templateName?: string;
  name?: string;
}

export function ok(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

export function err(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}

export function okList<T>(
  data: { header?: unknown; result?: T[]; totalCount?: number },
  mapper: (item: T) => Record<string, unknown>,
  filter?: Record<string, string>,
) {
  let items = (data.result ?? []).map(mapper);
  if (filter) {
    const patterns = Object.entries(filter).map(([key, pattern]) => [key, new RegExp(pattern)] as const);
    items = items.filter((item) =>
      patterns.every(([key, re]) => {
        const val = item[key];
        return val != null && re.test(String(val));
      }),
    );
  }
  return ok({ totalCount: items.length, result: items });
}

export const bindTokenSchema = z.string().length(8).describe("bind 도구로 발급받은 8자리 바인드 토큰");

export const paginationSchema = {
  page: z.number().int().min(0).optional().describe("페이지 번호 (0부터 시작, 기본값 0)"),
  size: z.number().int().min(1).max(100).optional().describe("페이지 크기 (기본값 20, 최대 100)"),
};

export const filterSchema = {
  filter: z.record(z.string(), z.string()).optional().describe("결과 필터링. 필드명을 키로, 정규식 패턴을 값으로 지정 (예: {emailAddress: 'injeinc\\\\.co\\\\.kr$', name: '^이'})"),
};
