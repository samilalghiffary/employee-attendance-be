import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { db } from './prisma/db.js';

@Injectable()
export class PrismaService implements OnModuleDestroy {
  public readonly client = db;

  async onModuleDestroy() {
    // Graceful disconnect handler if needed
  }
}
