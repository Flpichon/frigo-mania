import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Request } from 'express';
import { Household, HouseholdDocument } from '../../households/household.schema';
import type { AuthUser } from '../decorators/current-user.decorator';

interface RequestWithUser extends Request {
  user: AuthUser;
  household?: HouseholdDocument;
}

/**
 * Guard à utiliser sur les routes paramétrées par `:householdId`.
 * Vérifie que l'utilisateur JWT est membre du foyer.
 * Doit être appliqué APRÈS JwtAuthGuard.
 */
@Injectable()
export class HouseholdMemberGuard implements CanActivate {
  constructor(
    @InjectModel(Household.name)
    private householdModel: Model<HouseholdDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    const rawId = request.params?.['householdId'];
    const householdId = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!householdId || !Types.ObjectId.isValid(householdId)) {
      throw new NotFoundException('Foyer introuvable');
    }

    const household = await this.householdModel.findById(householdId).exec();
    if (!household) {
      throw new NotFoundException('Foyer introuvable');
    }

    if (!household.memberIds.includes(user.userId)) {
      throw new ForbiddenException("Vous n'êtes pas membre de ce foyer");
    }

    // Attacher le foyer à la requête pour éviter un double fetch dans le controller
    request.household = household;
    return true;
  }
}
