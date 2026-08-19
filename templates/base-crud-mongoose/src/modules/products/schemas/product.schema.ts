import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type ProductDocument = HydratedDocument<Product>;

export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  DISCONTINUED = 'DISCONTINUED',
}

@Schema({
  timestamps: true,
  collection: 'products',
  toJSON: {
    virtuals: true,
    transform: (_, ret: Record<string, unknown>) => {
      ret['id'] = ret['_id'];
      delete ret['_id'];
      delete ret['__v'];
      return ret;
    },
  },
})
export class Product {
  // Virtual id field (mapped from _id)
  id: string;

  @Prop({ required: true, maxlength: 150, trim: true })
  name: string;

  @Prop({ maxlength: 1000 })
  description?: string;

  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  sku: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true, min: 0, default: 0 })
  stock: number;

  @Prop({ maxlength: 100 })
  category?: string;

  @Prop({
    type: String,
    enum: Object.values(ProductStatus),
    default: ProductStatus.ACTIVE,
  })
  status: ProductStatus;

  /** Soft-delete timestamp — null/undefined means record is active */
  @Prop({ type: Date, default: null, index: true })
  deletedAt?: Date | null;

  // Timestamps added automatically by { timestamps: true }
  createdAt: Date;
  updatedAt: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Partial index: only index active documents
ProductSchema.index({ sku: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
