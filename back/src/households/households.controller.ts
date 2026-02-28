import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { HouseholdsService } from './households.service';
import { CreateHouseholdDto } from './dto/create-household.dto';
import { UpdateHouseholdDto } from './dto/update-household.dto';
import { JoinHouseholdDto } from './dto/join-household.dto';

@UseGuards(JwtAuthGuard)
@Controller('households')
export class HouseholdsController {
  constructor(private readonly householdsService: HouseholdsService) {}

  /**
   * POST /api/households
   * Crée un nouveau foyer. L'utilisateur connecté en devient owner et premier membre.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateHouseholdDto, @CurrentUser() user: AuthUser) {
    return this.householdsService.create(dto, user.userId);
  }

  /**
   * GET /api/households
   * Liste tous les foyers dont l'utilisateur est membre.
   */
  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.householdsService.findAllForUser(user.userId);
  }

  /**
   * GET /api/households/:id/members
   * Retourne les profils Keycloak (nom, prénom, email) de tous les membres.
   */
  @Get(':id/members')
  getMembers(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.householdsService.getMembers(id, user.userId);
  }

  /**
   * GET /api/households/:id
   * Détail d'un foyer (accessible aux membres uniquement via vérification dans le service).
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.householdsService.findOne(id);
  }

  /**
   * PATCH /api/households/:id
   * Renommer le foyer (owner uniquement).
   */
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateHouseholdDto, @CurrentUser() user: AuthUser) {
    return this.householdsService.update(id, dto, user.userId);
  }

  /**
   * DELETE /api/households/:id
   * Supprime le foyer (owner uniquement).
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.householdsService.remove(id, user.userId);
  }

  // ---------------------------------------------------------------------------
  // Gestion des membres
  // ---------------------------------------------------------------------------

  /**
   * DELETE /api/households/:id/members/:memberId
   * Retire un membre du foyer.
   * - Owner peut retirer n'importe quel membre
   * - Un membre peut se retirer lui-même
   */
  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.householdsService.removeMember(id, memberId, user.userId);
  }

  /**
   * PATCH /api/households/:id/owner
   * Transfère la propriété du foyer à un autre membre (owner uniquement).
   */
  @Patch(':id/owner')
  transferOwnership(
    @Param('id') id: string,
    @Body('newOwnerId') newOwnerId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.householdsService.transferOwnership(id, newOwnerId, user.userId);
  }

  // ---------------------------------------------------------------------------
  // Invitations
  // ---------------------------------------------------------------------------

  /**
   * POST /api/households/:id/invite
   * Génère un token d'invitation valable 48h (owner uniquement).
   * Retourne le token brut — le front construit le lien complet.
   */
  @Post(':id/invite')
  async generateInvite(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const token = await this.householdsService.generateInviteToken(id, user.userId);
    return { token };
  }

  /**
   * POST /api/households/join
   * Rejoindre un foyer via un token d'invitation.
   */
  @Post('join')
  @HttpCode(HttpStatus.OK)
  join(@Body() dto: JoinHouseholdDto, @CurrentUser() user: AuthUser) {
    return this.householdsService.joinWithToken(dto, user.userId);
  }
}
