import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();


// CREATE
export const createEvent = async (req: Request, res: Response) => {
  try {
    const {
      name, description, startDate, endDate, location, createdById
    } = req.body;

    const event = await prisma.conference.create({
      data: {
        name,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        location,
        createdById,
      },
    });

    res.status(201).json(event);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};


// READ (already implemented: getEventsByOrganizer)
export const getEventsByOrganizer = async (req: Request, res: Response) => {
  try {
    const organizerId = Number(req.query.organizerId);
    if (!organizerId) {
        res.status(400).json({ message: "Missing organizerId" });
        return;
    }
    const events = await prisma.conference.findMany({
      where: { createdById: organizerId },
      orderBy: { startDate: "desc" }, // or any order you want
    });
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// GET /events/:id - Get single event by ID
export const getEventById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const event = await prisma.conference.findUnique({
      where: { id: Number(id) },
    });
    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }
    res.json(event);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};


// UPDATE
export const updateEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name, description, startDate, endDate, location
    } = req.body;

    const event = await prisma.conference.update({
      where: { id: Number(id) },
      data: {
        name,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        location,
      },
    });

    res.json(event);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE
export const deleteEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.conference.delete({
      where: { id: Number(id) },
    });
    res.json({ message: "Event deleted" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};