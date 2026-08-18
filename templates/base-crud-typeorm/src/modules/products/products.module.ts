import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';

/**
 * Products Module (TypeORM)
 *
 * Registers Product entity with TypeORM and wires the controller & service.
 * The Product entity must also be added to the DatabaseModule's entities array.
 *
 * @example
 * // In app.module.ts:
 * import { ProductsModule } from './modules/products/products.module';
 * @Module({ imports: [ProductsModule] })
 * export class AppModule {}
 */
@Module({
  imports: [TypeOrmModule.forFeature([Product])],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
