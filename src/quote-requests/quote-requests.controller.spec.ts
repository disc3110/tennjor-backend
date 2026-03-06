import { Test, TestingModule } from '@nestjs/testing';
import { QuoteRequestsController } from './quote-requests.controller';

describe('QuoteRequestsController', () => {
  let controller: QuoteRequestsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuoteRequestsController],
    }).compile();

    controller = module.get<QuoteRequestsController>(QuoteRequestsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
