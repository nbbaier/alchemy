import { Effect } from "effect";
import { createAwsClient } from "./client.ts";

export type AccountId = string & {
  readonly __brand: "AccountId";
};

/**
 * Helper to get the current AWS account ID
 */
export async function AccountId(): Promise<AccountId> {
  const client = await createAwsClient({ service: "sts" });
  const effect = client.postJson<{ GetCallerIdentityResult: { Account: string } }>("/", {
    Action: "GetCallerIdentity",
    Version: "2011-06-15",
  });
  const identity = await Effect.runPromise(effect);
  return identity.GetCallerIdentityResult.Account as AccountId;
}
