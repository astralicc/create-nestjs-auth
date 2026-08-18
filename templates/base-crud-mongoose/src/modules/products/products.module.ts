import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { Product, ProductSchema } from './schemas/product.schema';

/**
 * Products Module (Mongoose)
 *
 * Registers Product schema with MongooseModule.forFeature.
 *
 * @example
 * // In app.module.ts:
 * import { ProductsModule } from './modules/products/products.module';
 * @Module({ imports: [ProductsModule] })
 * export class AppModule {}
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
