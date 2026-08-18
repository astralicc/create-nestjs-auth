import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { PrismaModule } from '../../database/prisma.module';

/**
 * Products Module
 *
 * Wires together the ProductsController, ProductsService, and PrismaModule.
 * Import this into AppModule to enable the /products API endpoints.
 *
 * @example
 * // In app.module.ts:
 * import { ProductsModule } from './modules/products/products.module';
 *
 * @Module({
 *   imports: [ProductsModule, ...],
 * })
 * export class AppModule {}
 */
@Module({
  imports: [PrismaModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService], // Export if other modules need ProductsService
})
export class ProductsModule {}
