// backend/src/modules/uploads/uploads.controller.ts

import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Body,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';

const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');

@Controller('uploads')
export class UploadsController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          // Multer body fields are not parsed yet when this runs, so we
          // always drop files into a temporary folder and move them in the
          // post handler below. This guarantees the destination is correct
          // regardless of multipart field order.
          const tmpDir = path.join(UPLOAD_ROOT, '_tmp');
          if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
          }
          cb(null, tmpDir);
        },
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname).toLowerCase();
          cb(null, `${uuidv4()}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) return cb(null, true);
        return cb(
          new BadRequestException('File harus berupa gambar (JPG, PNG, WebP)'),
          false,
        );
      },
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folderBody?: string,
    @Query('folder') folderQuery?: string,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');

    // Sanitise the folder name and move from _tmp into its final location.
    const rawFolder = folderBody || folderQuery || 'general';
    const safeFolder = String(rawFolder).replace(/[^a-zA-Z0-9_-]/g, '') || 'general';

    const finalDir = path.join(UPLOAD_ROOT, safeFolder);
    if (!fs.existsSync(finalDir)) {
      fs.mkdirSync(finalDir, { recursive: true });
    }

    const finalPath = path.join(finalDir, file.filename);
    try {
      fs.renameSync(file.path, finalPath);
    } catch (e) {
      // If rename fails (e.g. cross-device), copy + unlink as a fallback.
      fs.copyFileSync(file.path, finalPath);
      try { fs.unlinkSync(file.path); } catch (_) { /* ignore */ }
    }

    // Return a relative path so it works on any origin. The browser will
    // call it as ${currentOrigin}/api/uploads/... and the platform ingress
    // proxies /api/* to this backend.
    const fileUrl = `/api/uploads/${safeFolder}/${file.filename}`;

    return {
      success: true,
      url: fileUrl,
      secure_url: fileUrl,
      fileUrl: fileUrl,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      folder: safeFolder,
    };
  }
}
