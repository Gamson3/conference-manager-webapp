import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { toast } from "sonner";
import { fetchAuthSession } from "aws-amplify/auth";
import axios from "axios";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// export function formatEnumString(str: string) {
//   return str.replace(/([A-Z])/g, " $1").trim();
// }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// export function cleanParams(params: Record<string, any>): Record<string, any> {
//   return Object.fromEntries(
//     Object.entries(params).filter(
//       (
//         [_, value] // eslint-disable-line @typescript-eslint/no-unused-vars
//       ) =>
//         value !== undefined &&
//         value !== "any" &&
//         value !== "" &&
//         (Array.isArray(value) ? value.some((v) => v !== null) : value !== null)
//     )
//   );
// }

type MutationMessages = {
  success?: string;
  error: string;
};

export const withToast = async <T>(
  mutationFn: Promise<T>,
  messages: Partial<MutationMessages>
) => {
  const { success, error } = messages;

  try {
    const result = await mutationFn;
    if (success) toast.success(success);
    return result;
  } catch (err) {
    if (error) toast.error(error);
    throw err;
  }
};

export const createNewUserInDatabase = async (
  user: any,
  idToken: any,
  userRole: string,
  fetchWithBQ: any
) => {
  const createEndpoint =  "/users"; // Universal endpoint for creating a user

  const createUserResponse = await fetchWithBQ({
    url: createEndpoint,
    method: "POST",
    body: {
      cognitoId: user.userId,
      name: user.username,
      email: idToken?.payload?.email || "",
      phoneNumber: "",
      role: userRole?.toLowerCase(),
    },
  });

  if (createUserResponse.error) {
    throw new Error("Failed to create user record");
  }

  return createUserResponse;
};

// Create an axios instance with auth
export const createAuthenticatedApi = async () => {
  const session = await fetchAuthSession();
  const idToken = session.tokens?.idToken?.toString();
  
  return axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
    headers: {
      Authorization: idToken ? `Bearer ${idToken}` : ''
    }
  });
};

// Helper to get just the token
export async function getIdToken() {
  const session = await fetchAuthSession();
  return session.tokens?.idToken?.toString();
}