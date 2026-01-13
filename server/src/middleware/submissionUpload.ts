import fs from "fs";
import path from "path";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import type { Request } from "express";

const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads");
const SUBMISSIONS_DIR = path.join(UPLOAD_ROOT, "submissions");

function ensureDirSync(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

ensureDirSync(SUBMISSIONS_DIR);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureDirSync(SUBMISSIONS_DIR);
    cb(null, SUBMISSIONS_DIR);
  },
  filename: (_req, file, cb) => {
    const originalExt = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${originalExt}`);
  },
});

export const submissionUpload = multer({
  storage,
  // Upper bound only; per-conference constraints enforced in controller.
  limits: { fileSize: 50 * 1024 * 1024 },
});

export function buildPublicFileUrl(req: Request, publicPath: string): string {
  const host = req.get("host");
  const protocol = req.protocol;
  return `${protocol}://${host}${publicPath}`;
}

export function getPublicPathForSubmissionFile(storedFileName: string): string {
  return `/uploads/submissions/${storedFileName}`;
}
