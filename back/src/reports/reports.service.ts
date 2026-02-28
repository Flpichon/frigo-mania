import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument, ProductDisposalReason } from '../products/product.schema';
import { GetReportDto, GetTopWastedDto, ReportPeriod } from './dto/get-report.dto';

export interface ReportSummary {
  period: ReportPeriod;
  from: Date;
  to: Date;
  consumed: number;
  thrown: number;
  total: number;
  wasteRate: number; // % arrondi à 1 décimale
}

export interface TopWastedItem {
  name: string;
  count: number;
}

export interface TopWastedReport {
  period: ReportPeriod;
  from: Date;
  to: Date;
  items: TopWastedItem[];
}

interface DisposalAggregateResult {
  _id: string;
  count: number;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,
  ) {}

  // ---------------------------------------------------------------------------
  // Summary : consumed vs thrown
  // ---------------------------------------------------------------------------

  async getSummary(householdId: string, dto: GetReportDto): Promise<ReportSummary> {
    const { from, to } = this.getDateRange(dto);

    const results = await this.productModel.aggregate<DisposalAggregateResult>([
      {
        $match: {
          householdId: new Types.ObjectId(householdId),
          isRemoved: true,
          disposalReason: { $in: [ProductDisposalReason.CONSUMED, ProductDisposalReason.THROWN] },
          updatedAt: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: '$disposalReason',
          count: { $sum: 1 },
        },
      },
    ]);

    const consumed =
      results.find((r) => r._id === (ProductDisposalReason.CONSUMED as string))?.count ?? 0;
    const thrown =
      results.find((r) => r._id === (ProductDisposalReason.THROWN as string))?.count ?? 0;
    const total = consumed + thrown;
    const wasteRate = total > 0 ? Math.round((thrown / total) * 1000) / 10 : 0;

    return { period: dto.period, from, to, consumed, thrown, total, wasteRate };
  }

  // ---------------------------------------------------------------------------
  // Top wasted products
  // ---------------------------------------------------------------------------

  async getTopWasted(householdId: string, dto: GetTopWastedDto): Promise<TopWastedReport> {
    const { from, to } = this.getDateRange(dto);
    const limit = dto.limit ?? 10;

    const items = await this.productModel.aggregate<TopWastedItem>([
      {
        $match: {
          householdId: new Types.ObjectId(householdId),
          isRemoved: true,
          disposalReason: ProductDisposalReason.THROWN,
          updatedAt: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: '$name',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          name: '$_id',
          count: 1,
        },
      },
    ]);

    return { period: dto.period, from, to, items };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private getDateRange(dto: GetReportDto): { from: Date; to: Date } {
    const ref = dto.date ? new Date(dto.date) : new Date();

    if (dto.period === ReportPeriod.WEEKLY) {
      // Semaine ISO : lundi → dimanche
      const day = ref.getDay(); // 0 = dimanche
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const from = new Date(ref);
      from.setDate(ref.getDate() + diffToMonday);
      from.setHours(0, 0, 0, 0);
      const to = new Date(from);
      to.setDate(from.getDate() + 6);
      to.setHours(23, 59, 59, 999);
      return { from, to };
    }

    // MONTHLY
    const from = new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0);
    const to = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
    return { from, to };
  }
}
