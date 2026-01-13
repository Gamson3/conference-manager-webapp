import { Role } from "@prisma/client";

export type CognitoGroupName = "admin" | "organizer";

export const roleFromGroups = (groups?: readonly string[]): Role => {
  if (!groups || groups.length === 0) return Role.user;
  if (groups.includes("admin")) return Role.admin;
  if (groups.includes("organizer")) return Role.organizer;
  return Role.user;
};
