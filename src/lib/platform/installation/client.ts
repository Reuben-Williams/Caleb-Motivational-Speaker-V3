import "server-only";

import type {
  AcknowledgeCommandResultInput,
  InstallationClient,
  InstallationCommandEnvelope,
  SanitizedHealthReport,
} from "@reuben-williams/next/control-plane";

export interface CalebRuntimeInstallationClient {
  pullCommands(): Promise<InstallationCommandEnvelope[]>;
  acknowledgeResult(input: AcknowledgeCommandResultInput): Promise<void>;
  reportHealth(report: SanitizedHealthReport): Promise<void>;
}

export class CalebInstallationClientError extends Error {
  readonly code = "caleb_installation_command_lease_invalid";
  constructor() {
    super("caleb_installation_command_lease_invalid");
    this.name = "CalebInstallationClientError";
  }
}

function failed(): never {
  throw new CalebInstallationClientError();
}

export function createCalebBoundedInstallationClient(
  base: Pick<InstallationClient, "pullCommands" | "acknowledgeResult" | "reportHealth">,
  options: { now?: () => Date } = {},
): CalebRuntimeInstallationClient {
  const now = options.now ?? (() => new Date());
  return {
    async pullCommands() {
      const commands = await base.pullCommands({ limit: 1, leaseSeconds: 60 });
      if (commands.length > 1) return failed();
      const minimumExpiry = now().getTime() + 30_000;
      if (commands.some((command) => Date.parse(command.leaseExpiresAt) < minimumExpiry)) {
        return failed();
      }
      return commands;
    },
    acknowledgeResult: (input) => base.acknowledgeResult(input),
    reportHealth: (report) => base.reportHealth(report),
  };
}
