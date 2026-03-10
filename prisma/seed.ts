import 'dotenv/config';
import {
  CompletedSaleStatus,
  DiscountType,
  InternalSaleQuoteStatus,
  PrismaClient,
  QuoteRequestSource,
  QuoteRequestStatus,
  UserRole,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL env var is not defined');
}

const pool = new Pool({
  connectionString: DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');
  const toMoney = (value: number) => Math.round(value * 100) / 100;
  const toPct = (value: number) => Math.round(value * 10000) / 10000;

  const sharedProductImages = [
    'https://res.cloudinary.com/dox2ajvii/image/upload/v1772735026/casual_blanco_1512x.jpg_b5nexc.webp',
    'https://res.cloudinary.com/dox2ajvii/image/upload/v1772735027/ICON_BLUE_TENIS_CONCORD_AZUL_1512x.jpg_bhsxub.webp',
    'https://res.cloudinary.com/dox2ajvii/image/upload/v1772735027/casual_dorado_1512x.jpg_kcjo7t.webp',
    'https://res.cloudinary.com/dox2ajvii/image/upload/v1772735027/CONCORDCASUALCAFE_1512x.jpg_kdhmni.webp',
    'https://res.cloudinary.com/dox2ajvii/image/upload/v1772735027/Tacos_de_futbol_concord_vapor_ngo_1512x.jpg_eaovx0.webp',
    'https://res.cloudinary.com/dox2ajvii/image/upload/v1772735028/tacosdefutbolconcorddorado2.jpg_cxeyxt.webp',
    'https://res.cloudinary.com/dox2ajvii/image/upload/v1772735030/tacosdefutbolconcordnegroamarillo2_1512x.jpg_wlgsrj.webp',
    'https://res.cloudinary.com/dox2ajvii/image/upload/v1772735031/tacosdefutbolconcordprimeblue2.jpg_deb8me.webp',
    'https://res.cloudinary.com/dox2ajvii/image/upload/v1772735614/Tenis_concord_correr_gris_2_1512x.jpg_npjmmr.webp',
    'https://res.cloudinary.com/dox2ajvii/image/upload/v1772735614/TENISCORRERCONCORD2_1512x.jpg_q4mz8v.webp',
  ];

  const sharedCategoryImageWebUrl =
    'https://res.cloudinary.com/dox2ajvii/image/upload/v1772736914/IMPROVE-YOUR-PERFORMANCE_ruyo3b.jpg';
  const sharedCategoryImageMobileUrl =
    'https://res.cloudinary.com/dox2ajvii/image/upload/v1772737572/DSC_6645_720x_ndhuvl.jpg';

  // --- Clean tables in FK-safe order ---
  await prisma.completedSaleItem.deleteMany();
  await prisma.completedSale.deleteMany();
  await prisma.internalSaleQuoteItem.deleteMany();
  await prisma.internalSaleQuote.deleteMany();
  await prisma.quoteRequestItem.deleteMany();
  await prisma.quoteRequest.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.storeConfig.deleteMany();

  await prisma.storeConfig.create({
    data: {
      whatsappPhone: '+12365916362',
      storeName: 'Zapatería Tennjor',
    },
  });
  console.log('🏬 StoreConfig created');

  const jmonPasswordHash = await bcrypt.hash('qufwiq-mypdar-kEpji6', 10);
  const diegoPasswordHash = await bcrypt.hash('hebvyx-sifxar-toPwo0', 10);
  const leninPasswordHash = await bcrypt.hash('padgit-cexkuh-hYmcu6', 10);

  const jmonAdmin = await prisma.user.upsert({
    where: { email: 'jmon216@gmail.com' },
    update: {
      password: jmonPasswordHash,
      name: 'Jorge Montante',
      role: UserRole.ADMIN,
    },
    create: {
      email: 'jmon216@gmail.com',
      password: jmonPasswordHash,
      name: 'Jmon Admin',
      role: UserRole.ADMIN,
    },
  });

  const diegoAdmin = await prisma.user.upsert({
    where: { email: 'disc3110@gmail.com' },
    update: {
      password: diegoPasswordHash,
      name: 'Diego Solis',
      role: UserRole.ADMIN,
    },
    create: {
      email: 'disc3110@gmail.com',
      password: diegoPasswordHash,
      name: 'Diego Solis',
      role: UserRole.ADMIN,
    },
  });

  const leninAdmin = await prisma.user.upsert({
    where: { email: 'leninin123@gmail.com' },
    update: {
      password: leninPasswordHash,
      name: 'Lenin Solis',
      role: UserRole.ADMIN,
    },
    create: {
      email: 'leninin123@gmail.com',
      password: leninPasswordHash,
      name: 'Lenin Admin',
      role: UserRole.ADMIN,
    },
  });

  const admin = diegoAdmin;

  console.log(
    '👤 Admin users created:',
    [jmonAdmin.email, diegoAdmin.email, leninAdmin.email].join(', '),
  );

  const futbol = await prisma.category.create({
    data: {
      name: 'Fútbol',
      slug: 'futbol',
      isActive: true,
      imageWebUrl: sharedCategoryImageWebUrl,
      imageMobileUrl: sharedCategoryImageMobileUrl,
    },
  });

  const futbolRapido = await prisma.category.create({
    data: {
      name: 'Fútbol rápido',
      slug: 'futbol-rapido',
      isActive: true,
      imageWebUrl: sharedCategoryImageWebUrl,
      imageMobileUrl: sharedCategoryImageMobileUrl,
    },
  });

  const casuales = await prisma.category.create({
    data: {
      name: 'Casuales',
      slug: 'casuales',
      isActive: true,
      imageWebUrl: sharedCategoryImageWebUrl,
      imageMobileUrl: sharedCategoryImageMobileUrl,
    },
  });

  const ropa = await prisma.category.create({
    data: {
      name: 'Ropa',
      slug: 'ropa',
      isActive: true,
      imageWebUrl: sharedCategoryImageWebUrl,
      imageMobileUrl: sharedCategoryImageMobileUrl,
    },
  });

  const running = await prisma.category.create({
    data: {
      name: 'Running',
      slug: 'running',
      isActive: true,
      imageWebUrl: sharedCategoryImageWebUrl,
      imageMobileUrl: sharedCategoryImageMobileUrl,
    },
  });

  const accesorios = await prisma.category.create({
    data: {
      name: 'Accesorios',
      slug: 'accesorios',
      isActive: true,
      imageWebUrl: sharedCategoryImageWebUrl,
      imageMobileUrl: sharedCategoryImageMobileUrl,
    },
  });

  const tennis = await prisma.category.create({
    data: {
      name: 'Tennis',
      slug: 'tennis',
      isActive: true,
      imageWebUrl: sharedCategoryImageWebUrl,
      imageMobileUrl: sharedCategoryImageMobileUrl,
    },
  });

  const categories = [
    futbol,
    futbolRapido,
    casuales,
    ropa,
    running,
    accesorios,
    tennis,
  ];

  console.log(
    '📦 Categories created:',
    categories.map((c) => c.slug).join(', '),
  );

  const slugify = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

  const pick = <T>(arr: T[], i: number) => arr[i % arr.length];

  const createdProductSlugs: string[] = [];

  const shoeSizes = [
    '22',
    '22.5',
    '23',
    '23.5',
    '24',
    '24.5',
    '25',
    '25.5',
    '26',
    '26.5',
    '27',
    '27.5',
    '28',
    '28.5',
    '29',
    '29.5',
  ];

  const colors = [
    'Negro',
    'Blanco',
    'Azul',
    'Rojo',
    'Verde',
    'Gris',
    'Café',
    'Dorado',
    'Amarillo',
  ];

  const ENABLE_BG_REMOVAL = false;

  const withCloudinaryTransform = (url: string) => {
    const marker = '/upload/';
    if (!url.includes('res.cloudinary.com') || !url.includes(marker)) {
      return url;
    }

    const base = 'c_fit,w_900,h_900,f_auto,q_auto';
    const fx = ENABLE_BG_REMOVAL ? `e_background_removal,${base}` : base;

    return url.replace(marker, `${marker}${fx}/`);
  };

  const buildShoeSizeVariants = (
    min: number,
    max: number,
    skuBase: string,
    colorList: string[],
  ) => {
    const available = shoeSizes
      .map((s) => ({ s, n: Number(s) }))
      .filter((x) => !Number.isNaN(x.n) && x.n >= min && x.n <= max)
      .map((x) => x.s);

    const pickedSizes = [
      available[0],
      available[Math.floor(available.length / 2)],
      available[available.length - 1],
    ].filter(Boolean);

    const pickedColors = (
      colorList?.length ? colorList : [pick(colors, 0), pick(colors, 3)]
    ).slice(0, 3);

    return {
      create: pickedSizes.map((size, idx) => {
        const c = pickedColors[idx % pickedColors.length];
        return {
          size,
          color: c,
          sku: `${skuBase}-${size}-${c}`
            .toUpperCase()
            .replace(/\s+/g, '')
            .replace(/[^A-Z0-9]/g, ''),
          stock: 8 + (idx % 6),
          isActive: true,
        };
      }),
    };
  };

  const createImagesFromUrls = (
    seedKey: string,
    urls: string[],
    index: number,
  ) => {
    const firstOriginalUrl = pick(urls, index);
    const secondOriginalUrl = pick(urls, index + 1);

    const firstTransformedUrl = withCloudinaryTransform(firstOriginalUrl);
    const secondTransformedUrl = withCloudinaryTransform(secondOriginalUrl);

    return {
      create: [
        {
          url: firstTransformedUrl,
          alt: `${seedKey} - imagen 1`,
          order: 1,
        },
        {
          url: secondTransformedUrl,
          alt: `${seedKey} - imagen 2`,
          order: 2,
        },
      ],
    };
  };

  const concordProducts: Array<{
    sku: string;
    name: string;
    categorySlug: string;
    material: string;
    price: number;
    sizeMin: number;
    sizeMax: number;
    colors: string[];
  }> = [
    {
      sku: 'S224TA',
      name: 'Prime Leather Blue',
      categorySlug: 'futbol',
      material: 'PIEL',
      price: 639.33,
      sizeMin: 25,
      sizeMax: 29.5,
      colors: ['Negro', 'Amarillo'],
    },
    {
      sku: 'S224TN',
      name: 'Prime Leather',
      categorySlug: 'futbol',
      material: 'PIEL',
      price: 639.33,
      sizeMin: 25,
      sizeMax: 29.5,
      colors: ['Negro', 'Amarillo'],
    },
    {
      sku: 'S225GN',
      name: 'Control Light X',
      categorySlug: 'futbol',
      material: 'MICROFIBRA',
      price: 583.04,
      sizeMin: 25,
      sizeMax: 29.5,
      colors: ['Negro', 'Verde'],
    },
    {
      sku: 'S225GO',
      name: 'Control Gold',
      categorySlug: 'futbol',
      material: 'MICROFIBRA',
      price: 583.04,
      sizeMin: 25,
      sizeMax: 29.5,
      colors: ['Blanco', 'Dorado'],
    },
    {
      sku: 'S225GV',
      name: 'Control Light',
      categorySlug: 'futbol',
      material: 'MICROFIBRA',
      price: 583.04,
      sizeMin: 25,
      sizeMax: 29.5,
      colors: ['Blanco', 'Negro', 'Amarillo'],
    },
    {
      sku: 'S222XV',
      name: 'Retro',
      categorySlug: 'futbol',
      material: 'PIEL',
      price: 639.33,
      sizeMin: 25,
      sizeMax: 29.5,
      colors: ['Negro', 'Amarillo'],
    },
    {
      sku: 'S222XN',
      name: 'Retro',
      categorySlug: 'futbol',
      material: 'PIEL',
      price: 639.33,
      sizeMin: 25,
      sizeMax: 29.5,
      colors: ['Negro', 'Blanco'],
    },
    {
      sku: 'S222XB',
      name: 'Retro',
      categorySlug: 'futbol',
      material: 'PIEL',
      price: 639.33,
      sizeMin: 25,
      sizeMax: 29.5,
      colors: ['Blanco', 'Azul'],
    },
    {
      sku: 'S222XC',
      name: 'Retro',
      categorySlug: 'futbol',
      material: 'PIEL',
      price: 639.33,
      sizeMin: 22,
      sizeMax: 29.5,
      colors: ['Blanco', 'Rojo'],
    },
    {
      sku: 'S222XP',
      name: 'Futbol Pro',
      categorySlug: 'futbol',
      material: 'PIEL',
      price: 639.33,
      sizeMin: 22,
      sizeMax: 29.5,
      colors: ['Gris', 'Amarillo'],
    },
    {
      sku: 'S222CA',
      name: 'Futbol Pro',
      categorySlug: 'futbol',
      material: 'PIEL',
      price: 639.33,
      sizeMin: 25,
      sizeMax: 29.5,
      colors: ['Azul', 'Naranja'],
    },
    {
      sku: 'S223XG',
      name: 'Futbol Elite',
      categorySlug: 'futbol',
      material: 'PIEL',
      price: 668.16,
      sizeMin: 25,
      sizeMax: 29.5,
      colors: ['Blanco', 'Dorado'],
    },
    {
      sku: 'S223XN',
      name: 'Futbol Elite',
      categorySlug: 'futbol',
      material: 'PIEL',
      price: 668.16,
      sizeMin: 25,
      sizeMax: 29.5,
      colors: ['Negro', 'Café'],
    },
    {
      sku: 'S185XB',
      name: 'Futbol Classic',
      categorySlug: 'futbol',
      material: 'PIEL',
      price: 649.94,
      sizeMin: 25,
      sizeMax: 29.5,
      colors: ['Blanco'],
    },
    {
      sku: 'S185XN',
      name: 'Futbol Classic',
      categorySlug: 'futbol',
      material: 'PIEL',
      price: 649.94,
      sizeMin: 25,
      sizeMax: 29.5,
      colors: ['Negro'],
    },
    {
      sku: 'S220GA',
      name: 'Speed Pro',
      categorySlug: 'futbol',
      material: 'TPU',
      price: 775.33,
      sizeMin: 22,
      sizeMax: 29.5,
      colors: ['Azul'],
    },
    {
      sku: 'S220GO',
      name: 'Speed Pro',
      categorySlug: 'futbol',
      material: 'TPU',
      price: 775.33,
      sizeMin: 22,
      sizeMax: 29.5,
      colors: ['Rojo'],
    },
    {
      sku: 'S220GG',
      name: 'Speed Pro',
      categorySlug: 'futbol',
      material: 'TPU',
      price: 775.33,
      sizeMin: 25,
      sizeMax: 29.5,
      colors: ['Blanco', 'Negro'],
    },
    {
      sku: 'S224MN',
      name: 'Prime Leather X',
      categorySlug: 'futbol-rapido',
      material: 'PIEL',
      price: 592.93,
      sizeMin: 25,
      sizeMax: 29.5,
      colors: ['Negro', 'Amarillo'],
    },
    {
      sku: 'S225MN',
      name: 'Control Turf X',
      categorySlug: 'futbol-rapido',
      material: 'MICROFIBRA',
      price: 559.84,
      sizeMin: 25,
      sizeMax: 29.5,
      colors: ['Negro', 'Verde'],
    },
    {
      sku: 'S225MO',
      name: 'Control Turf Gold',
      categorySlug: 'futbol-rapido',
      material: 'MICROFIBRA',
      price: 559.84,
      sizeMin: 25,
      sizeMax: 29.5,
      colors: ['Blanco', 'Dorado'],
    },
    {
      sku: 'S225MV',
      name: 'Control Turf',
      categorySlug: 'futbol-rapido',
      material: 'MICROFIBRA',
      price: 559.84,
      sizeMin: 25,
      sizeMax: 29.5,
      colors: ['Blanco', 'Amarillo'],
    },
    {
      sku: 'S222F',
      name: 'Futbol Rapido',
      categorySlug: 'futbol-rapido',
      material: 'PIEL',
      price: 592.93,
      sizeMin: 25,
      sizeMax: 29.5,
      colors: ['Negro', 'Amarillo'],
    },
    {
      sku: 'S222FN',
      name: 'Futbol Rapido',
      categorySlug: 'futbol-rapido',
      material: 'PIEL',
      price: 592.93,
      sizeMin: 25,
      sizeMax: 29.5,
      colors: ['Negro', 'Blanco'],
    },
    {
      sku: 'S222FR',
      name: 'Futbol Rapido',
      categorySlug: 'futbol-rapido',
      material: 'PIEL',
      price: 592.93,
      sizeMin: 25,
      sizeMax: 29.5,
      colors: ['Blanco', 'Rojo'],
    },
    {
      sku: 'S222FB',
      name: 'Futbol Rapido',
      categorySlug: 'futbol-rapido',
      material: 'PIEL',
      price: 592.93,
      sizeMin: 25,
      sizeMax: 29.5,
      colors: ['Blanco', 'Azul'],
    },
    {
      sku: 'S222FP',
      name: 'Futbol Rapido',
      categorySlug: 'futbol-rapido',
      material: 'PIEL',
      price: 592.93,
      sizeMin: 25,
      sizeMax: 29.5,
      colors: ['Gris', 'Amarillo'],
    },
    {
      sku: 'S222FC',
      name: 'Futbol Rapido',
      categorySlug: 'futbol-rapido',
      material: 'PIEL',
      price: 592.93,
      sizeMin: 22,
      sizeMax: 29.5,
      colors: ['Rojo', 'Blanco'],
    },
    {
      sku: 'S222FA',
      name: 'Futbol Rapido',
      categorySlug: 'futbol-rapido',
      material: 'PIEL',
      price: 592.93,
      sizeMin: 22,
      sizeMax: 29.5,
      colors: ['Azul', 'Naranja'],
    },
    {
      sku: 'S220F0',
      name: 'Futbol Rapido Pro',
      categorySlug: 'futbol-rapido',
      material: 'TPU',
      price: 712.31,
      sizeMin: 22,
      sizeMax: 29.5,
      colors: ['Rojo'],
    },
    {
      sku: 'S208QN',
      name: 'Futbol Rapido',
      categorySlug: 'futbol-rapido',
      material: 'PIEL',
      price: 636.84,
      sizeMin: 25,
      sizeMax: 29.5,
      colors: ['Negro'],
    },
    {
      sku: 'S185QN',
      name: 'Futbol Rapido',
      categorySlug: 'futbol-rapido',
      material: 'PIEL',
      price: 592.93,
      sizeMin: 25,
      sizeMax: 29.5,
      colors: ['Negro'],
    },
    {
      sku: 'S185QB',
      name: 'Futbol Rapido',
      categorySlug: 'futbol-rapido',
      material: 'PIEL',
      price: 592.93,
      sizeMin: 25,
      sizeMax: 29.5,
      colors: ['Blanco'],
    },
    {
      sku: 'C200DN',
      name: 'Classic Black',
      categorySlug: 'casuales',
      material: 'PIEL',
      price: 628.31,
      sizeMin: 22,
      sizeMax: 29.5,
      colors: ['Negro'],
    },
    {
      sku: 'C200DB',
      name: 'Classic White',
      categorySlug: 'casuales',
      material: 'PIEL',
      price: 628.31,
      sizeMin: 22,
      sizeMax: 29.5,
      colors: ['Blanco'],
    },
    {
      sku: 'C202SG',
      name: 'Icon Gold',
      categorySlug: 'casuales',
      material: 'PIEL',
      price: 571.56,
      sizeMin: 25,
      sizeMax: 29.5,
      colors: ['Dorado'],
    },
    {
      sku: 'C202SC',
      name: 'Icon Brown',
      categorySlug: 'casuales',
      material: 'PIEL',
      price: 571.56,
      sizeMin: 25,
      sizeMax: 29.5,
      colors: ['Café'],
    },
    {
      sku: 'C202SN',
      name: 'Icon Black',
      categorySlug: 'casuales',
      material: 'PIEL',
      price: 571.56,
      sizeMin: 25,
      sizeMax: 29.5,
      colors: ['Negro'],
    },
    {
      sku: 'C202SA',
      name: 'Icon Blue',
      categorySlug: 'casuales',
      material: 'PIEL',
      price: 571.56,
      sizeMin: 25,
      sizeMax: 29.5,
      colors: ['Azul'],
    },
    {
      sku: 'C202SB',
      name: 'Icon White',
      categorySlug: 'casuales',
      material: 'PIEL',
      price: 571.56,
      sizeMin: 25,
      sizeMax: 29.5,
      colors: ['Blanco'],
    },
    {
      sku: 'R110CN',
      name: 'Runner',
      categorySlug: 'running',
      material: 'TEXTIL',
      price: 616.24,
      sizeMin: 25,
      sizeMax: 29.5,
      colors: ['Negro'],
    },
    {
      sku: 'R110CA',
      name: 'Runner',
      categorySlug: 'running',
      material: 'TEXTIL',
      price: 616.24,
      sizeMin: 25,
      sizeMax: 29.5,
      colors: ['Azul', 'Rojo'],
    },
    {
      sku: 'R110CG',
      name: 'Runner',
      categorySlug: 'running',
      material: 'TEXTIL',
      price: 616.24,
      sizeMin: 25,
      sizeMax: 29.5,
      colors: ['Gris', 'Naranja'],
    },
    {
      sku: 'K222XB',
      name: 'Kangaroo Pro',
      categorySlug: 'futbol',
      material: 'PIEL DE CANGURO',
      price: 998.0,
      sizeMin: 25,
      sizeMax: 29.5,
      colors: ['Blanco', 'Azul'],
    },
    {
      sku: 'K222XP',
      name: 'Kangaroo Pro',
      categorySlug: 'futbol',
      material: 'PIEL DE CANGURO',
      price: 998.0,
      sizeMin: 25,
      sizeMax: 29.5,
      colors: ['Gris', 'Amarillo'],
    },
    {
      sku: 'K185XB',
      name: 'Kangaroo Pro',
      categorySlug: 'futbol',
      material: 'PIEL DE CANGURO',
      price: 998.0,
      sizeMin: 25,
      sizeMax: 29.5,
      colors: ['Blanco'],
    },
  ];

  const buildDescription = (p: (typeof concordProducts)[number]) => {
    const colorText = p.colors?.length
      ? ` Colores: ${p.colors.join(', ')}.`
      : '';
    return `${p.name} (${p.sku}). Material: ${p.material}. Corrida: ${p.sizeMin}-${p.sizeMax}. Precio: $${p.price}.${colorText}`;
  };

  const categoryIdBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  for (let i = 0; i < concordProducts.length; i++) {
    const p = concordProducts[i];
    const categoryId = categoryIdBySlug.get(p.categorySlug);

    if (!categoryId) {
      console.warn(
        `⚠️  Skipping ${p.sku} because category slug not found: ${p.categorySlug}`,
      );
      continue;
    }

    const productSlug = `${p.sku.toLowerCase()}-${slugify(p.name)}`;

    const product = await prisma.product.create({
      data: {
        name: p.name,
        slug: productSlug,
        description: buildDescription(p),
        baseCost: toMoney(p.price * 0.58),
        costCurrency: 'MXN',
        categoryId,
        isActive: true,
        images: createImagesFromUrls(p.sku, sharedProductImages, i),
        variants: buildShoeSizeVariants(p.sizeMin, p.sizeMax, p.sku, p.colors),
      },
    });

    createdProductSlugs.push(product.slug);
  }

  console.log(`👟 Products created: ${createdProductSlugs.length}`);

  const commercialProducts = await prisma.product.findMany({
    orderBy: { createdAt: 'asc' },
    take: 2,
    select: {
      id: true,
      name: true,
      slug: true,
      baseCost: true,
      variants: {
        where: { isActive: true },
        orderBy: { size: 'asc' },
        take: 1,
        select: {
          id: true,
          size: true,
          color: true,
          sku: true,
        },
      },
    },
  });

  if (commercialProducts.length < 2) {
    throw new Error(
      'Seed requires at least 2 products to build sales fixtures.',
    );
  }

  const [productA, productB] = commercialProducts;
  const variantA = productA.variants[0];
  const variantB = productB.variants[0];

  const publicQuoteRequest = await prisma.quoteRequest.create({
    data: {
      customerName: 'Comercial Cliente Demo',
      customerPhone: '+5215511122233',
      customerEmail: 'compras.demo@example.com',
      customerCity: 'Ciudad de México',
      notes: 'Solicita propuesta para mayoreo.',
      source: QuoteRequestSource.WEB_FORM,
      status: QuoteRequestStatus.NEW,
      items: {
        create: [
          {
            productId: productA.id,
            productNameSnapshot: productA.name,
            productSlugSnapshot: productA.slug,
            size: variantA?.size ?? '26',
            color: variantA?.color ?? 'Negro',
            quantity: 12,
          },
          {
            productId: productB.id,
            productNameSnapshot: productB.name,
            productSlugSnapshot: productB.slug,
            size: variantB?.size ?? '26',
            color: variantB?.color ?? 'Blanco',
            quantity: 8,
          },
        ],
      },
    },
  });

  const draftItemAQuantity = 12;
  const draftItemAUnitSale = 780;
  const draftItemAUnitCost = toMoney(
    Number(productA.baseCost ?? toMoney(draftItemAUnitSale * 0.6)),
  );
  const draftItemALineRevenue = toMoney(
    draftItemAQuantity * draftItemAUnitSale,
  );
  const draftItemALineCost = toMoney(draftItemAQuantity * draftItemAUnitCost);
  const draftItemALineProfit = toMoney(
    draftItemALineRevenue - draftItemALineCost,
  );

  const draftItemBQuantity = 8;
  const draftItemBUnitSale = 640;
  const draftItemBUnitCost = toMoney(
    Number(productB.baseCost ?? toMoney(draftItemBUnitSale * 0.6)),
  );
  const draftItemBLineRevenue = toMoney(
    draftItemBQuantity * draftItemBUnitSale,
  );
  const draftItemBLineCost = toMoney(draftItemBQuantity * draftItemBUnitCost);
  const draftItemBLineProfit = toMoney(
    draftItemBLineRevenue - draftItemBLineCost,
  );

  const draftSubtotal = toMoney(draftItemALineRevenue + draftItemBLineRevenue);
  const draftDiscountTotal = 500;
  const draftTotalRevenue = toMoney(draftSubtotal - draftDiscountTotal);
  const draftTotalCost = toMoney(draftItemALineCost + draftItemBLineCost);
  const draftTotalProfit = toMoney(draftTotalRevenue - draftTotalCost);
  const draftMarginPct =
    draftTotalRevenue > 0
      ? toPct((draftTotalProfit / draftTotalRevenue) * 100)
      : null;

  const draftInternalQuote = await prisma.internalSaleQuote.create({
    data: {
      code: 'SQ-2026-000001',
      status: InternalSaleQuoteStatus.DRAFT,
      customerName: 'Comercial Cliente Demo',
      customerPhone: '+5215511122233',
      customerEmail: 'compras.demo@example.com',
      customerCity: 'Ciudad de México',
      notes: 'Borrador interno para negociación mayoreo.',
      currency: 'MXN',
      subtotal: draftSubtotal,
      discountTotal: draftDiscountTotal,
      totalRevenue: draftTotalRevenue,
      totalCost: draftTotalCost,
      totalProfit: draftTotalProfit,
      marginPct: draftMarginPct,
      publicQuoteRequestId: publicQuoteRequest.id,
      createdByUserId: admin.id,
      items: {
        create: [
          {
            productId: productA.id,
            variantId: variantA?.id,
            productNameSnapshot: productA.name,
            productSlugSnapshot: productA.slug,
            sizeSnapshot: variantA?.size ?? null,
            colorSnapshot: variantA?.color ?? null,
            skuSnapshot: variantA?.sku ?? null,
            quantity: draftItemAQuantity,
            unitSalePrice: draftItemAUnitSale,
            unitCostSnapshot: draftItemAUnitCost,
            lineRevenue: draftItemALineRevenue,
            lineCost: draftItemALineCost,
            lineProfit: draftItemALineProfit,
            discountType: DiscountType.PERCENTAGE,
            discountValue: 5,
            sortOrder: 1,
          },
          {
            productId: productB.id,
            variantId: variantB?.id,
            productNameSnapshot: productB.name,
            productSlugSnapshot: productB.slug,
            sizeSnapshot: variantB?.size ?? null,
            colorSnapshot: variantB?.color ?? null,
            skuSnapshot: variantB?.sku ?? null,
            quantity: draftItemBQuantity,
            unitSalePrice: draftItemBUnitSale,
            unitCostSnapshot: draftItemBUnitCost,
            lineRevenue: draftItemBLineRevenue,
            lineCost: draftItemBLineCost,
            lineProfit: draftItemBLineProfit,
            discountType: DiscountType.FIXED,
            discountValue: 120,
            sortOrder: 2,
          },
        ],
      },
    },
  });

  const completedItemQuantity = 20;
  const completedItemUnitSale = 760;
  const completedItemUnitCost = toMoney(
    Number(productA.baseCost ?? toMoney(completedItemUnitSale * 0.6)),
  );
  const completedItemLineRevenue = toMoney(
    completedItemQuantity * completedItemUnitSale,
  );
  const completedItemLineCost = toMoney(
    completedItemQuantity * completedItemUnitCost,
  );
  const completedItemLineProfit = toMoney(
    completedItemLineRevenue - completedItemLineCost,
  );
  const completedDiscountTotal = 800;
  const completedTotalRevenue = toMoney(
    completedItemLineRevenue - completedDiscountTotal,
  );
  const completedTotalCost = completedItemLineCost;
  const completedTotalProfit = toMoney(
    completedTotalRevenue - completedTotalCost,
  );
  const completedMarginPct =
    completedTotalRevenue > 0
      ? toPct((completedTotalProfit / completedTotalRevenue) * 100)
      : null;

  const completedAt = new Date();
  const completedInternalQuote = await prisma.internalSaleQuote.create({
    data: {
      code: 'SQ-2026-000002',
      status: InternalSaleQuoteStatus.COMPLETED,
      customerName: 'Distribuidora Rivera',
      customerPhone: '+5215577788899',
      customerEmail: 'ventas@rivera-demo.mx',
      customerCity: 'Guadalajara',
      notes: 'Cotización convertida a venta cerrada.',
      currency: 'MXN',
      subtotal: completedItemLineRevenue,
      discountTotal: completedDiscountTotal,
      totalRevenue: completedTotalRevenue,
      totalCost: completedTotalCost,
      totalProfit: completedTotalProfit,
      marginPct: completedMarginPct,
      createdByUserId: admin.id,
      approvedAt: new Date(completedAt.getTime() - 2 * 60 * 60 * 1000),
      completedAt,
      items: {
        create: [
          {
            productId: productA.id,
            variantId: variantA?.id,
            productNameSnapshot: productA.name,
            productSlugSnapshot: productA.slug,
            sizeSnapshot: variantA?.size ?? null,
            colorSnapshot: variantA?.color ?? null,
            skuSnapshot: variantA?.sku ?? null,
            quantity: completedItemQuantity,
            unitSalePrice: completedItemUnitSale,
            unitCostSnapshot: completedItemUnitCost,
            lineRevenue: completedItemLineRevenue,
            lineCost: completedItemLineCost,
            lineProfit: completedItemLineProfit,
            discountType: DiscountType.FIXED,
            discountValue: completedDiscountTotal,
            sortOrder: 1,
          },
        ],
      },
    },
  });

  const completedSale = await prisma.completedSale.create({
    data: {
      saleNumber: 'S-2026-000001',
      quoteId: completedInternalQuote.id,
      status: CompletedSaleStatus.COMPLETED,
      customerName: completedInternalQuote.customerName,
      customerPhone: completedInternalQuote.customerPhone,
      customerEmail: completedInternalQuote.customerEmail,
      customerCity: completedInternalQuote.customerCity,
      currency: 'MXN',
      subtotal: completedItemLineRevenue,
      discountTotal: completedDiscountTotal,
      totalRevenue: completedTotalRevenue,
      totalCost: completedTotalCost,
      totalProfit: completedTotalProfit,
      marginPct: completedMarginPct,
      notes: 'Venta cerrada en mostrador mayorista.',
      createdByUserId: admin.id,
      completedAt,
      items: {
        create: [
          {
            productId: productA.id,
            variantId: variantA?.id,
            productNameSnapshot: productA.name,
            productSlugSnapshot: productA.slug,
            sizeSnapshot: variantA?.size ?? null,
            colorSnapshot: variantA?.color ?? null,
            skuSnapshot: variantA?.sku ?? null,
            quantity: completedItemQuantity,
            unitSalePrice: completedItemUnitSale,
            unitCostSnapshot: completedItemUnitCost,
            lineRevenue: completedItemLineRevenue,
            lineCost: completedItemLineCost,
            lineProfit: completedItemLineProfit,
            discountType: DiscountType.FIXED,
            discountValue: completedDiscountTotal,
          },
        ],
      },
    },
  });

  console.log('🧾 Public quote request created:', publicQuoteRequest.id);
  console.log(
    '💼 Internal sale quotes created:',
    [draftInternalQuote.code, completedInternalQuote.code].join(', '),
  );
  console.log('💰 Completed sale created:', completedSale.saleNumber);
  console.log('✅ Seed finished successfully');
}

main()
  .catch((e) => {
    console.error('❌ Seed error', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
