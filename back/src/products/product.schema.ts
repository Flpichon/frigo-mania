import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductDocument = Product & Document;

export enum ProductStatus {
  OK = 'ok',
  EXPIRING_SOON = 'expiring_soon',
  EXPIRED = 'expired',
}

export enum ProductDisposalReason {
  CONSUMED = 'consumed',
  THROWN = 'thrown',
  EXPIRED_PRODUCT = 'expired_product',
  ENTRY_ERROR = 'entry_error',
}

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true })
  name: string;

  @Prop()
  brand?: string;

  @Prop()
  category?: string;

  @Prop({ required: true })
  barcode: string;

  @Prop({ required: true })
  expirationDate: Date;

  @Prop({ type: Object })
  nutritionFacts?: Record<string, unknown>;

  @Prop({ type: Types.ObjectId, ref: 'Household', required: true })
  householdId: Types.ObjectId;

  @Prop({ required: true })
  addedByUserId: string; // Keycloak user ID

  @Prop({ type: String, enum: ProductDisposalReason, default: null })
  disposalReason?: ProductDisposalReason | null;

  @Prop({ type: Date, default: null })
  removedAt?: Date | null;

  @Prop({ default: false })
  isRemoved: boolean;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
