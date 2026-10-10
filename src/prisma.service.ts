import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { db } from './prisma/db.js';

@Injectable()
export class PrismaService implements OnModuleDestroy {
  public readonly client = db;

  /**
   * Health check ping to verify database connectivity.
   */
  async ping(): Promise<boolean> {
    try {
      const plan = this.client.raw.sql`SELECT 1 as ping`
        .affectedCount()
        .build();
      await this.client.runtime().execute(plan);
      return true;
    } catch {
      return false;
    }
  }

  async onModuleDestroy() {
    try {
      await this.client.close();
    } catch {
      // ignore close errors on shutdown
    }
  }
}
