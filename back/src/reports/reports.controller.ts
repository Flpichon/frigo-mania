import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HouseholdMemberGuard } from '../common/guards/household-member.guard';
import { ReportsService } from './reports.service';
import { GetReportDto, GetTopWastedDto } from './dto/get-report.dto';

@Controller('households/:householdId/reports')
@UseGuards(JwtAuthGuard, HouseholdMemberGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * GET /api/households/:householdId/reports/summary?period=weekly|monthly&date=YYYY-MM-DD
   * Retourne le nombre de produits consommés vs jetés sur la période.
   */
  @Get('summary')
  async getSummary(@Param('householdId') householdId: string, @Query() dto: GetReportDto) {
    return this.reportsService.getSummary(householdId, dto);
  }

  /**
   * GET /api/households/:householdId/reports/top-wasted?period=weekly|monthly&date=YYYY-MM-DD&limit=10
   * Retourne les produits les plus jetés sur la période.
   */
  @Get('top-wasted')
  async getTopWasted(@Param('householdId') householdId: string, @Query() dto: GetTopWastedDto) {
    return this.reportsService.getTopWasted(householdId, dto);
  }
}
