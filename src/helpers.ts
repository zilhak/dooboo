import { z } from "zod";

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

export const bindTokenSchema = z.string().length(8).describe("bind 도구로 발급받은 8자리 바인드 토큰");

export const paginationSchema = {
  page: z.number().int().min(0).optional().describe("페이지 번호 (0부터 시작, 기본값 0)"),
  size: z.number().int().min(1).max(100).optional().describe("페이지 크기 (기본값 20, 최대 100)"),
};
