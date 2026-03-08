/* eslint-disable @typescript-eslint/no-base-to-string */
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createHash } from 'crypto';

type CloudinaryUploadInput = {
  fileBuffer: Buffer;
  filename: string;
  folder: string;
};

type CloudinaryUploadResult = {
  url: string;
  secureUrl: string | null;
  publicId: string;
};

type CloudinaryDestroyResult = {
  result: string;
};

@Injectable()
export class CloudinaryService {
  private readonly cloudName: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly folderRoot: string;

  constructor() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    const missing: string[] = [];
    if (!cloudName) missing.push('CLOUDINARY_CLOUD_NAME');
    if (!apiKey) missing.push('CLOUDINARY_API_KEY');
    if (!apiSecret) missing.push('CLOUDINARY_API_SECRET');

    if (missing.length > 0) {
      throw new Error(
        `Missing Cloudinary env vars: ${missing.join(', ')}. Cloudinary-backed media endpoints require these variables.`,
      );
    }

    this.cloudName = cloudName!;
    this.apiKey = apiKey!;
    this.apiSecret = apiSecret!;
    this.folderRoot = process.env.CLOUDINARY_FOLDER_ROOT || 'tennjor';
  }

  getFolderRoot(): string {
    return this.folderRoot;
  }

  async uploadImage(
    input: CloudinaryUploadInput,
  ): Promise<CloudinaryUploadResult> {
    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign = {
      folder: input.folder,
      timestamp,
    };

    const signature = this.buildSignature(paramsToSign);
    const formData = new FormData();
    formData.append(
      'file',
      new Blob([new Uint8Array(input.fileBuffer)]),
      input.filename,
    );
    formData.append('folder', input.folder);
    formData.append('api_key', this.apiKey);
    formData.append('timestamp', String(timestamp));
    formData.append('signature', signature);

    const response = await fetch(this.uploadUrl(), {
      method: 'POST',
      body: formData,
    });

    const payload = (await response.json()) as Record<string, unknown>;

    if (!response.ok || payload.error) {
      const errorMessage =
        (payload.error as { message?: string } | undefined)?.message ||
        'Cloudinary upload failed.';
      throw new InternalServerErrorException(errorMessage);
    }

    return {
      url: String(payload.url || ''),
      secureUrl: payload.secure_url ? String(payload.secure_url) : null,
      publicId: String(payload.public_id || ''),
    };
  }

  async destroyImage(publicId: string): Promise<CloudinaryDestroyResult> {
    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign = {
      invalidate: true,
      public_id: publicId,
      timestamp,
    };

    const signature = this.buildSignature(paramsToSign);
    const body = new URLSearchParams({
      public_id: publicId,
      invalidate: 'true',
      api_key: this.apiKey,
      timestamp: String(timestamp),
      signature,
    });

    const response = await fetch(this.destroyUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    const payload = (await response.json()) as Record<string, unknown>;

    if (!response.ok || payload.error) {
      const errorMessage =
        (payload.error as { message?: string } | undefined)?.message ||
        'Cloudinary destroy failed.';
      throw new InternalServerErrorException(errorMessage);
    }

    return {
      result: String(payload.result || 'unknown'),
    };
  }

  private uploadUrl(): string {
    return `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;
  }

  private destroyUrl(): string {
    return `https://api.cloudinary.com/v1_1/${this.cloudName}/image/destroy`;
  }

  private buildSignature(
    params: Record<string, string | number | boolean>,
  ): string {
    const serialized = Object.entries(params)
      .map(([key, value]) => [key, String(value)] as const)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

    return createHash('sha1')
      .update(`${serialized}${this.apiSecret}`)
      .digest('hex');
  }
}
