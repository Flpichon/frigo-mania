import { IsString, IsNotEmpty } from 'class-validator';

export class JoinHouseholdDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}
