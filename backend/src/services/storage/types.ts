export interface UploadResult {
  key: string;
  url: string;
  size: number;
  mimeType: string;
  fileName: string;
}

export interface UploadInput {
  key: string;
  mimeType: string;
  fileName: string;
  data?: Buffer;
}

export interface UploadStreamInput extends UploadInput {
  stream: NodeJS.ReadableStream;
  size: number;
}

export interface SignedUrlOptions {
  expirySeconds?: number;
  downloadName?: string;
}

export interface StorageProvider {
  upload(input: UploadInput): Promise<UploadResult>;
  uploadStream(input: UploadInput & { stream: NodeJS.ReadableStream; size: number }): Promise<UploadResult>;
  getSignedUrl(key: string, opts?: SignedUrlOptions): Promise<string>;
  deleteFile(key: string): Promise<void>;
  getFile(key: string): Promise<{ stream: NodeJS.ReadableStream; mimeType: string; size: number } | null>;
  listFiles(prefix: string): Promise<string[]>;
}
