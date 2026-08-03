import { config } from '../../config';
import { StorageProvider, UploadInput, UploadStreamInput, SignedUrlOptions, UploadResult } from './types';

interface S3ClientLike {
  send(command: any): Promise<any>;
}

export class S3StorageProvider implements StorageProvider {
  private client: S3ClientLike | null = null;
  private bucket = config.s3.bucket;
  private region = config.s3.region;
  private endpoint = config.s3.endpoint;
  private publicBaseUrl = config.s3.publicBaseUrl;

  private async getClient(): Promise<S3ClientLike> {
    if (this.client) return this.client;
    const { S3Client } = await import('@aws-sdk/client-s3');
    this.client = new S3Client({
      region: this.region,
      endpoint: this.endpoint || undefined,
      forcePathStyle: !!this.endpoint,
      credentials: {
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey,
      },
    });
    return this.client;
  }

  private async getPresigner() {
    return await import('@aws-sdk/s3-request-presigner');
  }

  private buildS3Import() {
    return import('@aws-sdk/client-s3');
  }

  async upload(input: UploadInput): Promise<UploadResult> {
    const client = await this.getClient();
    const { PutObjectCommand } = await this.buildS3Import();
    const data = input.data ?? Buffer.alloc(0);
    await client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: data,
        ContentType: input.mimeType,
      })
    );
    return { key: input.key, url: input.key, size: data.length, mimeType: input.mimeType, fileName: input.fileName };
  }

  async uploadStream(input: UploadStreamInput): Promise<UploadResult> {
    const client = await this.getClient();
    const { Upload } = await import('@aws-sdk/lib-storage');
    const { Readable } = await import('stream');
    const body = Readable.from(input.stream as any);
    const parallel = new Upload({
      client: client as any,
      params: {
        Bucket: this.bucket,
        Key: input.key,
        Body: body as any,
        ContentType: input.mimeType,
      },
      queueSize: 8,
      partSize: 8 * 1024 * 1024,
    });
    await parallel.done();
    return { key: input.key, url: input.key, size: input.size, mimeType: input.mimeType, fileName: input.fileName };
  }

  async getSignedUrl(key: string, opts: SignedUrlOptions = {}): Promise<string> {
    const { getSignedUrl } = await this.getPresigner();
    const { GetObjectCommand } = await this.buildS3Import();
    const client = await this.getClient();
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ...(opts.downloadName ? { ResponseContentDisposition: `attachment; filename="${opts.downloadName}"` } : {}),
    });
    return getSignedUrl(client as any, command, { expiresIn: opts.expirySeconds ?? 3600 });
  }

  async deleteFile(key: string): Promise<void> {
    const client = await this.getClient();
    const { DeleteObjectCommand } = await this.buildS3Import();
    await client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async getFile(key: string) {
    const client = await this.getClient();
    const { GetObjectCommand } = await this.buildS3Import();
    try {
      const res = await client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      return {
        stream: res.Body as NodeJS.ReadableStream,
        mimeType: res.ContentType || 'application/octet-stream',
        size: res.ContentLength || 0,
      };
    } catch {
      return null;
    }
  }

  async getPublicUrl(key: string): Promise<string> {
    if (this.publicBaseUrl) return `${this.publicBaseUrl.replace(/\/$/, '')}/${encodeURIComponent(key)}`;
    return this.getSignedUrl(key);
  }

  async listFiles(prefix: string): Promise<string[]> {
    const client = await this.getClient();
    const { ListObjectsV2Command } = await this.buildS3Import();
    const keys: string[] = [];
    let token: string | undefined;
    do {
      const res = await client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: token,
        })
      );
      for (const obj of res.Contents || []) {
        if (obj.Key) keys.push(obj.Key);
      }
      token = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (token);
    return keys.sort();
  }
}
