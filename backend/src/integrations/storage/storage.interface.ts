/** File-storage provider abstraction. Replace mock with CloudinaryService / S3Service in production. */
export interface UploadResult {
  url: string;
  publicId: string;
  size: number;
  contentType: string;
}

export interface IStorageService {
  uploadFile(buffer: Buffer, opts: { filename: string; contentType: string }): Promise<UploadResult>;
  deleteFile(publicId: string): Promise<void>;
}
export const STORAGE_SERVICE = Symbol('IStorageService');
