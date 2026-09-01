import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { defineTool } from "../../define-tool";
import { hostServiceCall } from "../../host-service-client";

interface TerminalSummary {
	terminalId: string;
	workspaceId: string;
	createdAt: number;
	exited: boolean;
	exitCode: number;
	attached: boolean;
	title: string | null;
}

export function register(server: McpServer): void {
	defineTool(server, {
		name: "terminals_list",
		annotations: { readOnlyHint: true },
		description:
			"List live terminal sessions (ids, titles, attach state) — the whole host by default, or one workspace via workspaceId. Use to discover a terminalId to terminals_send/terminals_read/terminals_close against when you didn't keep the one agents_create returned. Use hosts_list / workspaces_list to find the hostId.",
		inputSchema: {
			hostId: z
				.string()
				.min(1)
				.describe("Host machineId to list terminal sessions on."),
			workspaceId: z
				.string()
				.uuid()
				.optional()
				.describe(
					"Workspace UUID to narrow to (omit for every workspace on the host).",
				),
		},
		handler: async (input, ctx) => {
			return hostServiceCall<{ sessions: TerminalSummary[] }>(
				{
					relayUrl: ctx.relayUrl,
					organizationId: ctx.organizationId,
					hostId: input.hostId,
					jwt: ctx.bearerToken,
				},
				"terminal.list",
				"query",
				{ workspaceId: input.workspaceId },
			);
		},
	});
}
