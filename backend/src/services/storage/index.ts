import { config } from '../../config';
import { StorageProvider } from './types';
import { LocalStorageProvider } from './local';
import { S3StorageProvider } from './s3';

let provider: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (!provider) {
    switch (config.storage.provider) {
      case 's3':
        provider = new S3StorageProvider();
        break;
      case 'local':
      default:
        provider = new LocalStorageProvider();
        break;
    }
  }
  return provider;
}

export function isLocalStorage(): boolean {
  return config.storage.provider === 'local';
}

export { StorageProvider, UploadInput, UploadStreamInput, SignedUrlOptions } from './types';
export { LocalStorageProvider } from './local';
