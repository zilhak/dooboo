import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { registerServerTool } from "./tools/register-server.ts";
import { registerTokenTool } from "./tools/register-token.ts";
import { listServersTool } from "./tools/list-servers.ts";
import { bindTool } from "./tools/bind.ts";

const PORT = Number(process.env.PORT) || 3000;

function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "dooboo",
    version: "0.1.0",
  });

  registerServerTool(server);
  registerTokenTool(server);
  listServersTool(server);
  bindTool(server);

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
