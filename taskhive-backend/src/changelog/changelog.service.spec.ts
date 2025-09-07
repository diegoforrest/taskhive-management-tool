import { Test, TestingModule } from '@nestjs/testing';
import { ChangelogService } from './changelog.service';

describe('ChangelogService', () => {
  let service: ChangelogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChangelogService],
    }).compile();

    service = module.get<ChangelogService>(ChangelogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
