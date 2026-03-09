import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

type CloudinaryUploadInput = {
  fileBuffer: Buffer;
  filename: string;
  folder: string;
  publicId?: string;
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
  private readonly folderRoot: string;
  private readonly productsFolder: string;
  private readonly categoriesFolder: string;

  constructor() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const folderRoot = process.env.CLOUDINARY_FOLDER_ROOT;
    const productsFolder = process.env.CLOUDINARY_PRODUCTS_FOLDER;
    const categoriesFolder = process.env.CLOUDINARY_CATEGORIES_FOLDER;

    const missing: string[] = [];
    if (!cloudName) missing.push('CLOUDINARY_CLOUD_NAME');
    if (!apiKey) missing.push('CLOUDINARY_API_KEY');
    if (!apiSecret) missing.push('CLOUDINARY_API_SECRET');
    if (!folderRoot) missing.push('CLOUDINARY_FOLDER_ROOT');
    if (!productsFolder) missing.push('CLOUDINARY_PRODUCTS_FOLDER');
    if (!categoriesFolder) missing.push('CLOUDINARY_CATEGORIES_FOLDER');

    if (missing.length > 0) {
      throw new Error(
        `Missing Cloudinary env vars: ${missing.join(', ')}. Cloudinary-backed media endpoints require these variables.`,
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    this.folderRoot = folderRoot!;
    this.productsFolder = productsFolder!;
    this.categoriesFolder = categoriesFolder!;
  }

  buildProductFolder(productSlug: string): string {
    return this.buildFolder(
      this.folderRoot,
      this.productsFolder,
      this.sanitizeSegment(productSlug),
    );
  }

  buildCategoryFolder(categorySlug: string): string {
    return this.buildFolder(
      this.folderRoot,
      this.categoriesFolder,
      this.sanitizeSegment(categorySlug),
    );
  }

  buildCategoryAssetPublicId(
    categorySlug: string,
    assetName: 'web' | 'mobile',
  ): string {
    return this.buildFolder(this.buildCategoryFolder(categorySlug), assetName);
  }

  async uploadImage(
    input: CloudinaryUploadInput,
  ): Promise<CloudinaryUploadResult> {
    const uploadOptions: {
      folder?: string;
      resource_type: 'image';
      use_filename?: boolean;
      unique_filename?: boolean;
      overwrite?: boolean;
      invalidate?: boolean;
      public_id?: string;
    } = {
      resource_type: 'image',
      folder: input.folder,
      use_filename: true,
      unique_filename: true,
    };

    if (input.publicId) {
      uploadOptions.public_id = input.publicId;
      uploadOptions.use_filename = false;
      uploadOptions.unique_filename = false;
      uploadOptions.overwrite = true;
      uploadOptions.invalidate = true;
    }

    const uploadResult = await new Promise<UploadApiResponse>(
      (resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
            if (error) {
              reject(new Error(error.message));
              return;
            }
            if (!result) {
              reject(new Error('Cloudinary upload returned no result.'));
              return;
            }
            resolve(result);
          },
        );

        Readable.from(input.fileBuffer).pipe(uploadStream);
      },
    ).catch((error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Cloudinary upload failed.';
      throw new InternalServerErrorException(message);
    });

    return {
      url: uploadResult.url,
      secureUrl: uploadResult.secure_url || null,
      publicId: uploadResult.public_id,
    };
  }

  async deleteImage(publicId: string): Promise<CloudinaryDestroyResult> {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'image',
        invalidate: true,
      });

      return {
        result:
          result && typeof result.result === 'string'
            ? result.result
            : 'unknown',
      };
    } catch (error) {
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'Cloudinary delete failed.',
      );
    }
  }

  private buildFolder(...segments: string[]): string {
    return segments
      .map((segment) => segment.replace(/^\/+|\/+$/g, ''))
      .join('/');
  }

  private sanitizeSegment(value: string): string {
    return value.trim().replace(/[^a-zA-Z0-9_-]/g, '-');
  }
}
