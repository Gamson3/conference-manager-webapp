import { Request, Response } from "express";
import prisma from '../lib/prisma';
import { Role } from "@prisma/client";
import { getUserCognitoId } from "../utils/authHelper";
import jwt from "jsonwebtoken";


export const ensureAndGetUser = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("[ENSURE-AND-GET] Processing request");
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("[ENSURE-AND-GET] No auth header provided");
      res.status(401).json({ message: "Missing authentication token" });
      return;
    }

    const token = authHeader.split(" ")[1];
    
    // Decode token to get user information
    const decoded = jwt.decode(token) as {
      sub: string;
      email?: string;
      name?: string;
      "custom:role"?: string;
      "cognito:username"?: string;
    };

    if (!decoded || !decoded.sub) {
      console.log("[ENSURE-AND-GET] Invalid token structure");
      res.status(400).json({ message: "Invalid token format" });
      return;
    }

    const cognitoId = decoded.sub;
    console.log(`[ENSURE-AND-GET] Processing user with cognitoId: ${cognitoId}`);

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { cognitoId }
    });
    
    // If user doesn't exist, create immediately (synchronous creation)
    if (!user) {
      console.log(`[ENSURE-AND-GET] User ${cognitoId} not found, creating new user`);
      
      // Extract user data from token
      const email = decoded?.email || '';
      const name = decoded?.name || 
                   decoded?.["cognito:username"] || 
                   (email ? email.split("@")[0] : "New User");
      const roleFromToken = decoded?.["custom:role"]?.toLowerCase() || "attendee";

      try {
        // Create user synchronously
        user = await prisma.user.create({
          data: {
            cognitoId,
            name,
            email,
            password: '',
            roles: [roleFromToken as Role]
          }
        });
        
        console.log(`[ENSURE-AND-GET] Created user with ID: ${user.id}`);
        res.status(201).json({ 
          message: "User created successfully",
          user
        });
        return;
      } catch (createError) {
        console.error("[ENSURE-AND-GET] Error creating user:", createError);
        res.status(500).json({ message: "Failed to create user" });
        return;
      }
    }

    // User exists, return it
    console.log(`[ENSURE-AND-GET] User exists with ID: ${user.id}`);
    res.status(200).json({ 
      message: "User retrieved successfully",
      user
    });
  } catch (error) {
    console.error("[ENSURE-AND-GET] Unexpected error:", error);
    res.status(500).json({ message: "Server error processing user" });
  }
};

/**
 * @deprecated Use ensureAndGetUser instead which combines user creation and retrieval
 */
// POST /users/ensure - Ensure the user exists in database
export const ensureUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Missing or malformed token" });
      return;
    }
    
    const token = authHeader.split(" ")[1];
    
    // Decode the token
    const decoded = jwt.decode(token) as {
      sub: string;
      email?: string;
      name?: string;
      "custom:role"?: string;
      "cognito:username"?: string;
    };
    
    if (!decoded || !decoded.sub) {
      res.status(400).json({ message: "Invalid token" });
      return;
    }
    
    const cognitoId = decoded.sub;
    
    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { cognitoId }
    });
    
    // If not, create the user
    if (!user) {
      // Extract user data from token
      const email = decoded.email || '';
      const name = decoded.name || decoded["cognito:username"] || email.split('@')[0] || 'New User';
      const role = decoded["custom:role"]?.toLowerCase() || 'attendee';
      
      // Create user
      user = await prisma.user.create({
        data: {
          cognitoId,
          name,
          email,
          password: '',
          roles: [role as Role]
        }
      });
      
      console.log(`[ENSURE USER] Created new user with ID: ${user.id}`);
      res.status(201).json({
        message: "User created successfully",
        user
      });
      return;
    }
    
    // User exists - return success
    res.status(200).json({
      message: "User already exists",
      user
    });
    
  } catch (error: any) {
    console.error("[ENSURE USER] Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// GET /users/:id - Get user by ID
export const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
    });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }else {
      res.json(user);
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// GET /users/me - Get current user profile
export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const cognitoId = getUserCognitoId(req);  // Use cognitoId instead of id
    
    if (!cognitoId) {
      res.status(401).json({ message: "Unauthorized - User not authenticated" });
      return;
    }
    
    const user = await prisma.user.findUnique({
      where: { cognitoId },
    });
    
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /users/me - Update current user profile
export const updateCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const cognitoId = getUserCognitoId(req);
    const { name, email } = req.body;
    
    if (!cognitoId) {
      res.status(401).json({ message: "Unauthorized - User not authenticated" });
      return;
    }
    
    
    const user = await prisma.user.update({
      where: { cognitoId },
      data: { name, email },
    });
    
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// GET /users - List all users (admin only)
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// POST /users/role - set user roles (admin only)
// Update the changeUserRole function to handle role exclusivity
export const setUserRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, roles } = req.body;
    
    if (!userId || !roles || !Array.isArray(roles)) {
      res.status(400).json({ message: "User ID and roles array are required" });
      return;
    }
    
    // Validate that each role exists in our Role enum
    for (const role of roles) {
      if (!Object.values(Role).includes(role as Role)) {
        res.status(400).json({ message: `Invalid role: ${role}` });
        return;
      }
    }
    
    // Check for business rules: organizer exclusivity
    if (roles.includes("organizer") && roles.length > 1 && !roles.includes("admin")) {
      res.status(400).json({ message: "Organizer role must be exclusive (except for admin)" });
      return;
    }
    
    // Update the user's roles in DB
    const user = await prisma.user.update({
      where: { id: Number(userId) },
      data: { roles: roles as Role[] },
    });
    
    res.json({
      message: "User roles updated successfully",
      user: {
        id: user.id,
        roles: user.roles
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// GET /users/cognito/:cognitoId - Get user by Cognito ID (for auth)
export const getUserByCognitoId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { cognitoId } = req.params;
    const user = await prisma.user.findUnique({
      where: { cognitoId }, // Use Cognito ID for lookup
    });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }else {
      res.json(user);
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// POST /users - Create user
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { cognitoId, name, email, password, roles } = req.body;
    if (!cognitoId || !name || !email) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }
    
    // Convert single role to array if needed
    const roleArray = Array.isArray(roles) ? roles : [roles || 'attendee'];
    
    // Validate role exclusivity
    if (roleArray.includes('organizer') && roleArray.length > 1 && !roleArray.includes('admin')) {
      res.status(400).json({ message: "Organizer role must be exclusive (except for admin)" });
      return;
    }
    
    const user = await prisma.user.create({
      data: {
        cognitoId,
        name,
        email,
        password: password || "", // In production, hash the password!
        roles: roleArray as Role[],
      },
    });
    res.status(201).json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};


export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { cognitoId } = req.params;
    const { name, email, password } = req.body;
    const user = await prisma.user.update({
      where: { cognitoId },
      data: { name, email, password },
    });
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /users/:id - Delete user
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.user.delete({
      where: { id: Number(id) },
    });
    res.json({ message: "User deleted" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Add this function to add a role to a user
export const addRoleToUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, role } = req.body;
    
    // Validate input
    if (!userId || !role) {
      res.status(400).json({ message: "User ID and role are required" });
      return;
    }
    
    // Fetch user
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) }
    });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    
    // Check if user already has the role
    if (user.roles.includes(role as Role)) {
      res.status(200).json({ message: `User already has role ${role}` });
      return;
    }
    
    // If trying to add organizer, ensure no other roles are present
    if (role === "organizer" && user.roles.length > 0) {
      res.status(400).json({ 
        message: "Cannot add organizer role to a user with existing roles. Organizer must be exclusive." 
      });
      return;
    }
    
    // If user is an organizer and trying to add another role, prevent it
    if (user.roles.includes("organizer" as Role) && role !== "organizer") {
      res.status(400).json({ 
        message: "Organizer cannot have additional roles" 
      });
      return;
    }
    
    // Update user roles
    await prisma.user.update({
      where: { id: Number(userId) },
      data: {
        roles: {
          push: role as Role
        }
      }
    });
    
    res.status(200).json({ message: `Role ${role} added to user successfully` });
  } catch (error: any) {
    console.error('Error adding role to user:', error);
    res.status(500).json({ message: 'Failed to add role to user', error: error.message });
  }
};