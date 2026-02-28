import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HouseholdMemberGuard } from '../common/guards/household-member.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { RemoveProductDto } from './dto/remove-product.dto';
import { FilterProductsDto } from './dto/filter-products.dto';
import type { ProductStatus } from './product.schema';

type ProductPlain = Record<string, unknown> & { status: ProductStatus };

/**
 * Tous les endpoints sont préfixés par /api/households/:householdId/products
 * afin de lier explicitement chaque produit à un foyer.
 */
@UseGuards(JwtAuthGuard, HouseholdMemberGuard)
@Controller('households/:householdId/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * POST /api/households/:householdId/products
   * Crée un nouveau produit dans le foyer.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('householdId') householdId: string,
    @Body() dto: CreateProductDto,
    @CurrentUser() user: AuthUser,
  ) {
    const product = await this.productsService.create(dto, householdId, user.userId);
    return this.withStatus(product.toObject() as Record<string, unknown>, product.expirationDate);
  }

  /**
   * GET /api/households/:householdId/products
   * Liste les produits avec filtres optionnels (status, category, tri).
   */
  @Get()
  async findAll(@Param('householdId') householdId: string, @Query() filters: FilterProductsDto) {
    const products = await this.productsService.findAll(householdId, filters);
    return products.map((p) =>
      this.withStatus(
        p.toObject() as Record<string, unknown>,
        p.expirationDate,
        filters.expiringSoonDays,
      ),
    );
  }

  /**
   * GET /api/households/:householdId/products/categories
   * Retourne les catégories uniques du foyer.
   */
  @Get('categories')
  async findCategories(@Param('householdId') householdId: string) {
    return this.productsService.findCategories(householdId);
  }

  /**
   * GET /api/households/:householdId/products/:id
   * Retourne un produit par son ID.
   */
  @Get(':id')
  async findOne(@Param('householdId') householdId: string, @Param('id') id: string) {
    const product = await this.productsService.findOne(id, householdId);
    return this.withStatus(product.toObject() as Record<string, unknown>, product.expirationDate);
  }

  /**
   * PATCH /api/households/:householdId/products/:id
   * Mise à jour partielle (ex: correction de date de péremption après OCR).
   */
  @Patch(':id')
  async update(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    const product = await this.productsService.update(id, dto, householdId);
    return this.withStatus(product.toObject() as Record<string, unknown>, product.expirationDate);
  }

  /**
   * DELETE /api/households/:householdId/products/:id
   * Soft-delete avec raison de suppression (consumed | thrown).
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @Body() dto: RemoveProductDto,
  ) {
    const product = await this.productsService.remove(id, dto, householdId);
    return this.withStatus(product.toObject() as Record<string, unknown>, product.expirationDate);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private withStatus(
    product: Record<string, unknown>,
    expirationDate: Date,
    expiringSoonDays?: number,
  ): ProductPlain {
    return {
      ...product,
      status: this.productsService.computeStatus(expirationDate, expiringSoonDays),
    };
  }
}
