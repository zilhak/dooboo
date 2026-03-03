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
