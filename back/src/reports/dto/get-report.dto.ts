import { IsEnum, IsOptional, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum ReportPeriod {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export class GetReportDto {
  @IsEnum(ReportPeriod)
  period: ReportPeriod;

  /**
   * Date de référence (ISO 8601). Pour weekly : semaine contenant cette date.
   * Pour monthly : mois contenant cette date.
   * Défaut : aujourd'hui.
   */
  @IsOptional()
  @IsDateString()
  date?: string;
}

export class GetTopWastedDto extends GetReportDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}
