import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { IStorageService, UploadResult } from './storage.interface';

@Injectable()
export class MockStorageService implements IStorageService {
  private readonly logger = new Logger('MockStorageService');

  async uploadFile(buffer: Buffer, opts: { filename: string; contentType: string }): Promise<UploadResult> {
    const publicId = `mock_${Date.now()}_${randomBytes(4).toString('hex')}`;
    const url = `https://picsum.photos/seed/${publicId}/600/400`;
    this.logger.log(`🗄️  [MOCK] uploaded ${opts.filename} (${buffer.length}b) -> ${url}`);
    return { url, publicId, size: buffer.length, contentType: opts.contentType };
  }

  async deleteFile(publicId: string) {
    this.logger.log(`🗄️  [MOCK] deleted ${publicId}`);
  }
}
