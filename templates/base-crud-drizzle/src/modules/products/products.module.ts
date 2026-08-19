import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { DatabaseModule } from '../../database/database.module';

/**
 * Products Module (Drizzle)
 *
 * DatabaseModule is @Global() so DRIZZLE token is available app-wide,
 * but we import it here explicitly for documentation clarity.
 *
 * @example
 * // In app.module.ts:
 * import { ProductsModule } from './modules/products/products.module';
 * @Module({ imports: [ProductsModule] })
 * export class AppModule {}
 */
@Module({
  imports: [DatabaseModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
