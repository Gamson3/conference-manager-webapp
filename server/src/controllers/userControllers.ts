import { Request, Response } from "express";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

// GET /users/:id - Get user by ID
export const getUser = async (req: Request, res: Response) => {
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

// GET /users/cognito/:cognitoId - Get user by Cognito ID (for auth)
export const getUserByCognitoId = async (req: Request, res: Response) => {
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
export const createUser = async (req: Request, res: Response) => {
  try {
    const { cognitoId, name, email, password, role } = req.body;
    if (!cognitoId || !name || !email || !role) {
      res.status(400).json({ message: "Missing required fields" });
      return 
    }
    const user = await prisma.user.create({
      data: {
        cognitoId,
        name,
        email,
        password: password || "", // In production, hash the password!
        role: role as Role,
      },
    });
    res.status(201).json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};


export const updateUser = async (req: Request, res: Response) => {
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
export const deleteUser = async (req: Request, res: Response) => {
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