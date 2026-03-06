import { Test, TestingModule } from '@nestjs/testing';
import { QuoteRequestsService } from './quote-requests.service';

describe('QuoteRequestsService', () => {
  let service: QuoteRequestsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QuoteRequestsService],
    }).compile();

    service = module.get<QuoteRequestsService>(QuoteRequestsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
