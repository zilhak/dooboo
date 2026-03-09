import { db } from "./db.ts";

interface Binding {
  server_url: string;
  token: string;
}

export function resolveBinding(bindToken: string): Binding {
  const row = db.query(`
    SELECT s.url as server_url, t.token
    FROM bindings b
    JOIN servers s ON b.server_id = s.id
    JOIN tokens t ON b.server_id = t.server_id
    WHERE b.bind_token = ?
  `).get(bindToken) as Binding | null;

  if (!row) {
    throw new Error(`유효하지 않은 bind_token: ${bindToken}`);
  }

  return row;
}

function deriveApiBaseUrl(siteUrl: string): string {
  const url = new URL(siteUrl);
  const host = url.hostname;

  if (host.endsWith(".gov-dooray.co.kr")) {
    return "https://api.gov-dooray.co.kr";
  }
  if (host.endsWith(".gov-dooray.com")) {
    return "https://api.gov-dooray.com";
  }
  if (host.endsWith(".dooray.co.kr")) {
    return "https://api.dooray.co.kr";
  }
  if (host.endsWith(".dooray.com")) {
    return "https://api.dooray.com";
  }

  throw new Error(`알 수 없는 Dooray 도메인: ${host}`);
}

interface FetchOptions {
  method?: string;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
}

export async function doorayFetch(bindToken: string, path: string, options?: FetchOptions) {
  const { server_url, token } = resolveBinding(bindToken);
  const apiBase = deriveApiBaseUrl(server_url);

  let url = `${apiBase}${path}`;

  if (options?.params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined && value !== null) {
        searchParams.set(key, String(value));
      }
    }
    const qs = searchParams.toString();
    if (qs) {
      url += `?${qs}`;
    }
  }

  const headers: Record<string, string> = {
    "Authorization": `dooray-api ${token}`,
  };

  const fetchOptions: RequestInit = {
    method: options?.method ?? "GET",
    headers,
  };

  if (options?.body !== undefined) {
    headers["Content-Type"] = "application/json";
    fetchOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, fetchOptions);
  return response.json();
}

export async function doorayDownload(bindToken: string, path: string, savePath: string): Promise<string> {
  const { server_url, token } = resolveBinding(bindToken);
  const apiBase = deriveApiBaseUrl(server_url);
  const url = `${apiBase}${path}`;

  // 1차: 리다이렉트 URL 확인
  const initialResponse = await fetch(url, {
    headers: { "Authorization": `dooray-api ${token}` },
    redirect: "manual",
  });

  let finalResponse: Response;
  if (initialResponse.status >= 300 && initialResponse.status < 400) {
    const redirectUrl = initialResponse.headers.get("location");
    if (!redirectUrl) {
      throw new Error(`리다이렉트 URL을 찾을 수 없습니다 (${initialResponse.status})`);
    }
    finalResponse = await fetch(redirectUrl, {
      headers: { "Authorization": `dooray-api ${token}` },
    });
  } else if (initialResponse.ok) {
    finalResponse = initialResponse;
  } else {
    // 디버그: 응답 본문 확인
    const body = await initialResponse.text();
    throw new Error(`다운로드 실패 (${initialResponse.status}): ${body.substring(0, 200)}`);
  }

  if (!finalResponse.ok) {
    throw new Error(`다운로드 실패 (${finalResponse.status}): ${finalResponse.statusText}`);
  }

  const buffer = await finalResponse.arrayBuffer();
  const { mkdirSync, existsSync, writeFileSync } = await import("node:fs");
  const { dirname } = await import("node:path");

  const dir = dirname(savePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(savePath, Buffer.from(buffer));
  return savePath;
}

export async function doorayUpload(
  bindToken: string,
  path: string,
  filePath: string,
): Promise<{ id: string; name?: string; size?: number }> {
  const { readFileSync, statSync } = await import("node:fs");
  const { basename } = await import("node:path");

  const { server_url, token } = resolveBinding(bindToken);
  const apiBase = deriveApiBaseUrl(server_url);
  const url = `${apiBase}${path}`;

  const fileName = basename(filePath);
  const fileBuffer = readFileSync(filePath);
  const stat = statSync(filePath);

  // MIME type 추론
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const mimeMap: Record<string, string> = {
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
    gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
    pdf: "application/pdf", zip: "application/zip",
    json: "application/json", txt: "text/plain",
  };
  const mimeType = mimeMap[ext] ?? "application/octet-stream";

  const blob = new Blob([fileBuffer], { type: mimeType });
  const formData = new FormData();
  formData.append("file", blob, fileName);

  const headers: Record<string, string> = {
    "Authorization": `dooray-api ${token}`,
  };

  // 1차 요청 (307 리다이렉트 수동 처리)
  const initialResponse = await fetch(url, {
    method: "POST",
    headers,
    body: formData,
    redirect: "manual",
  });

  let finalResponse: Response;
  if (initialResponse.status >= 300 && initialResponse.status < 400) {
    const redirectUrl = initialResponse.headers.get("location");
    if (!redirectUrl) {
      throw new Error(`리다이렉트 URL을 찾을 수 없습니다 (${initialResponse.status})`);
    }
    finalResponse = await fetch(redirectUrl, {
      method: "POST",
      headers,
      body: formData,
    });
  } else if (initialResponse.ok) {
    finalResponse = initialResponse;
  } else {
    const body = await initialResponse.text();
    throw new Error(`업로드 실패 (${initialResponse.status}): ${body.substring(0, 200)}`);
  }

  if (!finalResponse.ok) {
    const body = await finalResponse.text();
    throw new Error(`업로드 실패 (${finalResponse.status}): ${body.substring(0, 200)}`);
  }

  const result = await finalResponse.json() as {
    header?: { isSuccessful?: boolean; resultMessage?: string };
    result?: { id: string; name?: string; size?: number };
  };

  if (!result.result?.id) {
    throw new Error(`업로드 응답에 파일 ID가 없습니다: ${JSON.stringify(result)}`);
  }

  return { id: result.result.id, name: fileName, size: stat.size };
}
