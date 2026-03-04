import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { registerServerTool } from "./tools/register-server.ts";
import { registerTokenTool } from "./tools/register-token.ts";
import { listServersTool } from "./tools/list-servers.ts";
import { bindTool } from "./tools/bind.ts";
import { commonTools } from "./tools/common.ts";
import { projectTools } from "./tools/project.ts";
import { postTools } from "./tools/post.ts";
import { calendarTools } from "./tools/calendar.ts";
import { messengerTools } from "./tools/messenger.ts";
import { wikiTools } from "./tools/wiki.ts";
import { driveTools } from "./tools/drive.ts";
import { contactTools } from "./tools/contact.ts";
import { reservationTools } from "./tools/reservation.ts";

const PORT = Number(process.env.PORT) || 12701;

function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "dooboo",
    version: "0.1.0",
    instructions: `Dooray 협업 플랫폼 MCP 서버입니다. 사용자가 Dooray, 업무(태스크), 위키, 캘린더, 메신저, 드라이브, 주소록, 자원예약 등을 언급하거나 nhnent.dooray.com URL을 제공할 때 이 서버를 사용하세요.

사용 흐름: list_servers → bind(server_id) → bind_token으로 도구 호출.
처음 사용 시: register_server(url) → register_token(server_id, token) → bind → 도구 호출.
티켓 조회: find_task_by_ticket(ticket, include)로 본문/댓글/이미지를 한번에 조회 가능.`,
  });

  registerServerTool(server);
  registerTokenTool(server);
  listServersTool(server);
  bindTool(server);
  commonTools(server);
  projectTools(server);
  postTools(server);
  calendarTools(server);
  messengerTools(server);
  wikiTools(server);
  driveTools(server);
  contactTools(server);
  reservationTools(server);

  return server;
}

const sessions = new Map<string, { transport: WebStandardStreamableHTTPServerTransport; server: McpServer }>();

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname !== "/mcp") {
      return new Response("Not Found", { status: 404 });
    }

    // MCP SDK requires Accept header with both application/json and text/event-stream.
    // Some MCP clients (e.g. Claude Code) may not send this, so we ensure it.
    const accept = req.headers.get("accept") ?? "";
    if (!accept.includes("application/json") || !accept.includes("text/event-stream")) {
      const headers = new Headers(req.headers);
      headers.set("accept", "application/json, text/event-stream");
      req = new Request(req, { headers });
    }

    if (req.method === "GET" || req.method === "DELETE") {
      const sessionId = req.headers.get("mcp-session-id");
      if (!sessionId || !sessions.has(sessionId)) {
        return new Response("Session not found", { status: 404 });
      }
      return sessions.get(sessionId)!.transport.handleRequest(req);
    }

    if (req.method === "POST") {
      const sessionId = req.headers.get("mcp-session-id");

      if (sessionId && sessions.has(sessionId)) {
        return sessions.get(sessionId)!.transport.handleRequest(req);
      }

      const mcpServer = createMcpServer();
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        onsessioninitialized: (id) => {
          sessions.set(id, { transport, server: mcpServer });
        },
        onsessionclosed: (id) => {
          sessions.delete(id);
        },
      });

      await mcpServer.connect(transport);
      return transport.handleRequest(req);
    }

    return new Response("Method Not Allowed", { status: 405 });
  },
});

console.log(`dooboo MCP server listening on http://localhost:${PORT}/mcp`);
