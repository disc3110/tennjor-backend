import { Test, TestingModule } from '@nestjs/testing';
import { QuoteRequestsController } from './quote-requests.controller';
import { QuoteRequestsService } from './quote-requests.service';

describe('QuoteRequestsController', () => {
  let controller: QuoteRequestsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuoteRequestsController],
      providers: [
        {
          provide: QuoteRequestsService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<QuoteRequestsController>(QuoteRequestsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
