import { CLIError, string, table } from "@superset/cli-framework";
import { getHostId } from "@superset/shared/host-info";
import { command } from "../../../lib/command";
import { resolveHostTarget } from "../../../lib/host-target";
import { findWorkspaceOnHost } from "../../../lib/host-workspaces";

interface TerminalSessionRow {
	terminalId: string;
	workspaceId: string;
	createdAt: number;
	exited: boolean;
	attached: boolean;
	title: string | null;
}

export default command({
	description:
		"List live terminal sessions — every workspace on the host, or one with --workspace",
	options: {
		workspace: string().desc(
			"Workspace ID (omit to list sessions across all workspaces on the host)",
		),
		host: string().desc("Host to list on (default: this machine)"),
	},
	display: (data) => {
		// Sessions known only to the pty-daemon (e.g. after a host-service
		// restart) carry no title, so group by workspace rather than name.
		const sessions = [
			...((data as { sessions: TerminalSessionRow[] }).sessions ?? []),
		].sort(
			(a, b) =>
				a.workspaceId.localeCompare(b.workspaceId) || a.createdAt - b.createdAt,
		);
		return table(
			sessions as unknown as Record<string, unknown>[],
			["workspaceId", "title", "attached", "exited", "terminalId"],
			["WORKSPACE", "TITLE", "ATTACHED", "EXITED", "TERMINAL"],
			[36, 30, 8, 6, 36],
		);
	},
	run: async ({ ctx, options }) => {
		const organizationId = ctx.config.organizationId;
		if (!organizationId) {
			throw new CLIError("No active organization", "Run: superset auth login");
		}

		const hostId = options.host ?? getHostId();
		const workspaceId = options.workspace ?? undefined;
		if (workspaceId) {
			const { workspace } = await findWorkspaceOnHost(
				{ organizationId, userJwt: ctx.bearer, api: ctx.api, hostId },
				workspaceId,
			);
			if (!workspace) {
				throw new CLIError(
					`Workspace not found on host ${hostId}: ${workspaceId}`,
					"Pass --host <id> if it lives on another machine",
				);
			}
		}

		const target = await resolveHostTarget({
			requestedHostId: hostId,
			organizationId,
			userJwt: ctx.bearer,
			api: ctx.api,
		});

		const result = await target.client.terminal.list.query({ workspaceId });

		return { data: result };
	},
});
