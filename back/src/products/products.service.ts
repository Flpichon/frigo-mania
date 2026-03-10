import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument, ProductStatus } from './product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { RemoveProductDto } from './dto/remove-product.dto';
import { FilterProductsDto } from './dto/filter-products.dto';

@Injectable()
export class ProductsService {
  constructor(@InjectModel(Product.name) private productModel: Model<ProductDocument>) {}

  async create(
    dto: CreateProductDto,
    householdId: string,
    userId: string,
  ): Promise<ProductDocument> {
    const product = new this.productModel({
      ...dto,
      expirationDate: new Date(dto.expirationDate),
      householdId: new Types.ObjectId(householdId),
      addedByUserId: userId,
    });
    return product.save();
  }

  async findAll(householdId: string, filters: FilterProductsDto): Promise<ProductDocument[]> {
    const {
      category,
      status,
      expiringSoonDays = 7,
      sortBy = 'expirationDate',
      sortOrder = 'asc',
    } = filters;
    const now = new Date();
    const soonThreshold = new Date(now);
    soonThreshold.setDate(soonThreshold.getDate() + expiringSoonDays);

    const query: Record<string, unknown> = {
      householdId: new Types.ObjectId(householdId),
      isRemoved: false,
    };

    if (category) {
      query.category = category;
    }

    if (status === ProductStatus.EXPIRED) {
      query.expirationDate = { $lt: now };
    } else if (status === ProductStatus.EXPIRING_SOON) {
      query.expirationDate = { $gte: now, $lte: soonThreshold };
    } else if (status === ProductStatus.OK) {
      query.expirationDate = { $gt: soonThreshold };
    }

    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    return this.productModel
      .find(query)
      .sort({ [sortBy]: sortDirection })
      .exec();
  }

  async findOne(id: string, householdId: string): Promise<ProductDocument> {
    const product = await this.productModel
      .findOne({
        _id: new Types.ObjectId(id),
        householdId: new Types.ObjectId(householdId),
        isRemoved: false,
      })
      .exec();

    if (!product) {
      throw new NotFoundException(`Produit ${id} introuvable`);
    }
    return product;
  }

  async update(id: string, dto: UpdateProductDto, householdId: string): Promise<ProductDocument> {
    const updateData: Record<string, unknown> = { ...dto };
    if (dto.expirationDate) {
      updateData.expirationDate = new Date(dto.expirationDate);
    }

    const product = await this.productModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          householdId: new Types.ObjectId(householdId),
          isRemoved: false,
        },
        { $set: updateData },
        { new: true },
      )
      .exec();

    if (!product) {
      throw new NotFoundException(`Produit ${id} introuvable`);
    }
    return product;
  }

  async remove(id: string, dto: RemoveProductDto, householdId: string): Promise<ProductDocument> {
    const product = await this.productModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          householdId: new Types.ObjectId(householdId),
          isRemoved: false,
        },
        {
          $set: {
            isRemoved: true,
            disposalReason: dto.disposalReason,
            removedAt: new Date(),
          },
        },
        { new: true },
      )
      .exec();

    if (!product) {
      throw new NotFoundException(`Produit ${id} introuvable`);
    }
    return product;
  }

  /**
   * Calcule le statut d'un produit en fonction de sa date de péremption.
   * Utile pour enrichir les réponses sans stocker le statut en base.
   */
  computeStatus(expirationDate: Date, expiringSoonDays = 7): ProductStatus {
    const now = new Date();
    const threshold = new Date(now);
    threshold.setDate(threshold.getDate() + expiringSoonDays);

    if (expirationDate < now) {
      return ProductStatus.EXPIRED;
    }
    if (expirationDate <= threshold) {
      return ProductStatus.EXPIRING_SOON;
    }
    return ProductStatus.OK;
  }

  /**
   * Retourne toutes les catégories uniques d'un foyer.
   */
  async findCategories(householdId: string): Promise<string[]> {
    const categories = await this.productModel.distinct('category', {
      householdId: new Types.ObjectId(householdId),
      isRemoved: false,
      category: { $ne: null },
    });
    return categories.filter(Boolean).sort();
  }
}
