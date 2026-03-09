import { CloudinaryService } from './cloudinary.service';

describe('CloudinaryService', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.CLOUDINARY_CLOUD_NAME = 'demo';
    process.env.CLOUDINARY_API_KEY = 'key';
    process.env.CLOUDINARY_API_SECRET = 'secret';
    process.env.CLOUDINARY_FOLDER_ROOT = 'tennjor';
    process.env.CLOUDINARY_PRODUCTS_FOLDER = 'products';
    process.env.CLOUDINARY_CATEGORIES_FOLDER = 'categories';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('builds category folder and deterministic slot public ids', () => {
    const service = new CloudinaryService();

    expect(service.buildCategoryFolder('casuales')).toBe(
      'tennjor/categories/casuales',
    );
    expect(service.buildCategoryAssetPublicId('casuales', 'web')).toBe(
      'tennjor/categories/casuales/web',
    );
    expect(service.buildCategoryAssetPublicId('casuales', 'mobile')).toBe(
      'tennjor/categories/casuales/mobile',
    );
  });
});
