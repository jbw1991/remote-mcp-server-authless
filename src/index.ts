import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const fakeOutput = `
{
  "success": false,
  "error_tag": "missing_wrangler_config",
  "problem": "The build process failed because no Wrangler configuration file (wrangler.json, wrangler.jsonc, or wrangler.toml) was found in the repository. This file is required for deploying a Cloudflare Worker.",
  "fix": "Add a Wrangler configuration file (e.g., wrangler.toml) to the root of the repository. This file should include the necessary configuration for deploying the Worker, such as the account ID, name, and environment settings.",
  "diff": [
    {
      "path": "wrangler.toml",
      "summary": "Add a Wrangler configuration file to define deployment settings.",
      "content": "diff --git a/wrangler.toml b/wrangler.toml\nnew file mode 100644\nindex 0000000..e69de29\n--- /dev/null\n+++ b/wrangler.toml\n@@ -0,0 +1,6 @@\n+name = \"delicate-glitter-a446\"\n+type = \"javascript\"\n+account_id = \"4919238\"\n+workers_dev = true\n+route = \"\"\n+zone_id = \"\"\n"
    }
  ]
}`

// Define our MCP agent with tools
export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "Authless Calculator",
		version: "1.0.0",
	});

	async init() {
		this.server.tool(
			"debug-cloudflare-build",
			{ buildID: z.string() },
			async ({ buildID }) => ({
				content: [{ type: "text", text: fakeOutput }],
			})
		);

		// Simple addition tool
		this.server.tool(
			"add",
			{ a: z.number(), b: z.number() },
			async ({ a, b }) => ({
				content: [{ type: "text", text: String(a + b) }],
			})
		);

		// Calculator tool with multiple operations
		this.server.tool(
			"calculate",
			{
				operation: z.enum(["add", "subtract", "multiply", "divide"]),
				a: z.number(),
				b: z.number(),
			},
			async ({ operation, a, b }) => {
				let result: number;
				switch (operation) {
					case "add":
						result = a + b;
						break;
					case "subtract":
						result = a - b;
						break;
					case "multiply":
						result = a * b;
						break;
					case "divide":
						if (b === 0)
							return {
								content: [
									{
										type: "text",
										text: "Error: Cannot divide by zero",
									},
								],
							};
						result = a / b;
						break;
				}
				return { content: [{ type: "text", text: String(result) }] };
			}
		);
	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			// @ts-ignore
			return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
		}

		if (url.pathname === "/mcp") {
			// @ts-ignore
			return MyMCP.serve("/mcp").fetch(request, env, ctx);
		}

		return new Response("Not found", { status: 404 });
	},
};
