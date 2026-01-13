import {
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";

export type CognitoGroupName = "admin" | "organizer";

const mustGetEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
};

let cachedClient: CognitoIdentityProviderClient | null = null;
const getClient = (): CognitoIdentityProviderClient => {
  if (cachedClient) return cachedClient;
  cachedClient = new CognitoIdentityProviderClient({
    region: mustGetEnv("AWS_REGION"),
  });
  return cachedClient;
};

const getUserPoolId = (): string => mustGetEnv("AWS_COGNITO_USER_POOL_ID");

/**
 * Adds a user to a Cognito group.
 * The user's next access token will include this group in `cognito:groups`.
 *
 * Clarification: In this system, the Cognito `Username` is equal to the `sub` claim
 * (stored as `cognitoId`), and the terms are used interchangeably. If your User Pool
 * uses a different `Username`, pass that `Username` instead.
 */
export const addUserToGroup = async (
  username: string,
  groupName: CognitoGroupName,
): Promise<void> => {
  const client = getClient();
  await client.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: getUserPoolId(),
      Username: username,
      GroupName: groupName,
    }),
  );
};

/**
 * Removes a user from a Cognito group.
 * The user's next access token will no longer include this group.
 *
 * Clarification: In this system, the Cognito `Username` is equal to the `sub` claim
 * (stored as `cognitoId`), and the terms are used interchangeably. If your User Pool
 * uses a different `Username`, pass that `Username` instead.
 */
export const removeUserFromGroup = async (
  username: string,
  groupName: CognitoGroupName,
): Promise<void> => {
  const client = getClient();
  await client.send(
    new AdminRemoveUserFromGroupCommand({
      UserPoolId: getUserPoolId(),
      Username: username,
      GroupName: groupName,
    }),
  );
};
