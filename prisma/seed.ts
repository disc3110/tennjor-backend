import { PrismaService } from '../src/prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaService();

async function main() {
  console.log('🌱 Seeding database...');

  // --- Clean tables in FK-safe order ---
  await prisma.productVariant.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.storeConfig.deleteMany();

  // --- Store config (single row) ---
  await prisma.storeConfig.create({
    data: {
      whatsappPhone: '+5215555555555',
      storeName: 'Zapatería Tennjor',
    },
  });
  console.log('🏬 StoreConfig created');

  // --- Hash demo passwords ---
  const adminPasswordHash = await bcrypt.hash('Admin123', 10);
  const userPasswordHash = await bcrypt.hash('User123', 10);

  // --- Users ---
  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password: adminPasswordHash,
      name: 'Admin Demo',
      role: UserRole.ADMIN,
    },
  });

  const customer = await prisma.user.create({
    data: {
      email: 'cliente@example.com',
      password: userPasswordHash,
      name: 'Cliente Demo',
      role: UserRole.USER,
    },
  });

  console.log('👤 Users created:', admin.email, customer.email);

  // --- Categories ---
  const sneakers = await prisma.category.create({
    data: {
      name: 'Tenis casual',
      slug: 'tenis-casual',
      isActive: true,
    },
  });

  const boots = await prisma.category.create({
    data: {
      name: 'Botas',
      slug: 'botas',
      isActive: true,
    },
  });

  const sandals = await prisma.category.create({
    data: {
      name: 'Sandalias',
      slug: 'sandalias',
      isActive: true,
    },
  });

  console.log('📦 Categories created');

  // --- Products + images + variants ---

  // 1) Sneaker
  const urbanRunner = await prisma.product.create({
    data: {
      name: 'Urban Runner X',
      slug: 'urban-runner-x',
      description: 'Tenis cómodos para uso diario, ligeros y modernos.',
      categoryId: sneakers.id,
      isActive: true,
      images: {
        create: [
          {
            url: 'https://picsum.photos/seed/urban-runner-front/600/600',
            alt: 'Urban Runner X - vista frontal',
            order: 1,
          },
          {
            url: 'https://picsum.photos/seed/urban-runner-side/600/600',
            alt: 'Urban Runner X - vista lateral',
            order: 2,
          },
        ],
      },
      variants: {
        create: [
          {
            size: '25',
            color: 'Negro',
            sku: 'URX-25-BLACK',
            stock: 10,
            isActive: true,
          },
          {
            size: '26',
            color: 'Blanco',
            sku: 'URX-26-WHITE',
            stock: 6,
            isActive: true,
          },
        ],
      },
    },
  });

  // 2) Boot
  const mountainBoot = await prisma.product.create({
    data: {
      name: 'Mountain Trek Pro',
      slug: 'mountain-trek-pro',
      description: 'Bota resistente para hiking y actividades al aire libre.',
      categoryId: boots.id,
      isActive: true,
      images: {
        create: [
          {
            url: 'https://picsum.photos/seed/mountain-trek/600/600',
            alt: 'Mountain Trek Pro',
            order: 1,
          },
        ],
      },
      variants: {
        create: [
          {
            size: '27',
            color: 'Café',
            sku: 'MTP-27-BROWN',
            stock: 8,
            isActive: true,
          },
          {
            size: '28',
            color: 'Negro',
            sku: 'MTP-28-BLACK',
            stock: 4,
            isActive: true,
          },
        ],
      },
    },
  });

  // 3) Sandal
  const beachSandal = await prisma.product.create({
    data: {
      name: 'Beach Comfort',
      slug: 'beach-comfort',
      description: 'Sandalia cómoda para playa con suela antideslizante.',
      categoryId: sandals.id,
      isActive: true,
      images: {
        create: [
          {
            url: 'https://picsum.photos/seed/beach-comfort/600/600',
            alt: 'Beach Comfort Sandal',
            order: 1,
          },
        ],
      },
      variants: {
        create: [
          {
            size: '24',
            color: 'Azul',
            sku: 'BC-24-BLUE',
            stock: 12,
            isActive: true,
          },
          {
            size: '25',
            color: 'Rosa',
            sku: 'BC-25-PINK',
            stock: 9,
            isActive: true,
          },
        ],
      },
    },
  });

  console.log(
    '👟 Products created:',
    urbanRunner.slug,
    mountainBoot.slug,
    beachSandal.slug,
  );
  console.log('✅ Seed finished successfully');
}

main()
  .catch((e) => {
    console.error('❌ Seed error', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
