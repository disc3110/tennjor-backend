import { Test, TestingModule } from '@nestjs/testing';
import { QuoteRequestsService } from './quote-requests.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { SalesQuotesService } from 'src/sales-quotes/sales-quotes.service';

describe('QuoteRequestsService', () => {
  let service: QuoteRequestsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuoteRequestsService,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: SalesQuotesService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<QuoteRequestsService>(QuoteRequestsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
