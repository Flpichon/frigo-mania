import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Household, HouseholdDocument } from './household.schema';
import { CreateHouseholdDto } from './dto/create-household.dto';
import { UpdateHouseholdDto } from './dto/update-household.dto';
import { JoinHouseholdDto } from './dto/join-household.dto';
import {
  KeycloakAdminService,
  type KeycloakUserProfile,
} from '../keycloak-admin/keycloak-admin.service';

const INVITE_TTL_HOURS = 48;

@Injectable()
export class HouseholdsService {
  constructor(
    @InjectModel(Household.name)
    private householdModel: Model<HouseholdDocument>,
    private keycloakAdmin: KeycloakAdminService,
  ) {}

  // ---------------------------------------------------------------------------
  // CRUD de base
  // ---------------------------------------------------------------------------

  async create(dto: CreateHouseholdDto, ownerId: string): Promise<HouseholdDocument> {
    await this.assertNameAvailable(dto.name);
    const household = new this.householdModel({
      name: dto.name.trim(),
      ownerId,
      memberIds: [ownerId], // le créateur est automatiquement membre
    });
    return household.save();
  }

  /** Retourne les profils Keycloak de tous les membres du foyer */
  async getMembers(householdId: string, requestingUserId: string): Promise<KeycloakUserProfile[]> {
    const household = await this.findOne(householdId);
    if (!household.memberIds.includes(requestingUserId)) {
      throw new ForbiddenException("Vous n'êtes pas membre de ce foyer");
    }
    return this.keycloakAdmin.getUsersByIds(household.memberIds);
  }

  /** Retourne tous les foyers dont l'utilisateur est membre */
  async findAllForUser(userId: string): Promise<HouseholdDocument[]> {
    return this.householdModel.find({ memberIds: userId }).exec();
  }

  async findOne(id: string): Promise<HouseholdDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Foyer introuvable');
    }
    const household = await this.householdModel.findById(id).exec();
    if (!household) {
      throw new NotFoundException('Foyer introuvable');
    }
    return household;
  }

  async update(id: string, dto: UpdateHouseholdDto, userId: string): Promise<HouseholdDocument> {
    const household = await this.findOne(id);
    this.assertOwner(household, userId);

    // Vérifier unicité uniquement si le nom change réellement
    if (dto.name.trim().toLowerCase() !== household.name.toLowerCase()) {
      await this.assertNameAvailable(dto.name, id);
    }

    household.name = dto.name.trim();
    return household.save();
  }

  /** Supprime le foyer — réservé au owner */
  async remove(id: string, userId: string): Promise<void> {
    const household = await this.findOne(id);
    this.assertOwner(household, userId);
    await this.householdModel.findByIdAndDelete(id).exec();
  }

  // ---------------------------------------------------------------------------
  // Gestion des membres
  // ---------------------------------------------------------------------------

  /** Retirer un membre du foyer (owner uniquement, sauf pour se retirer soi-même) */
  async removeMember(
    householdId: string,
    targetUserId: string,
    requestingUserId: string,
  ): Promise<HouseholdDocument> {
    const household = await this.findOne(householdId);

    const isSelf = targetUserId === requestingUserId;
    const isOwner = household.ownerId === requestingUserId;

    if (!isSelf && !isOwner) {
      throw new ForbiddenException('Seul le propriétaire peut retirer un autre membre');
    }

    if (targetUserId === household.ownerId) {
      throw new BadRequestException(
        'Le propriétaire ne peut pas quitter son foyer. Supprimez-le ou transférez la propriété.',
      );
    }

    household.memberIds = household.memberIds.filter((id) => id !== targetUserId);
    return household.save();
  }

  /** Transférer la propriété du foyer à un autre membre */
  async transferOwnership(
    householdId: string,
    newOwnerId: string,
    requestingUserId: string,
  ): Promise<HouseholdDocument> {
    const household = await this.findOne(householdId);
    this.assertOwner(household, requestingUserId);

    if (!household.memberIds.includes(newOwnerId)) {
      throw new BadRequestException('Le nouvel owner doit être membre du foyer');
    }

    household.ownerId = newOwnerId;
    return household.save();
  }

  // ---------------------------------------------------------------------------
  // Système d'invitation par token
  // ---------------------------------------------------------------------------

  /** Génère un lien d'invitation valable 48h */
  async generateInviteToken(householdId: string, requestingUserId: string): Promise<string> {
    const household = await this.findOne(householdId);
    this.assertOwner(household, requestingUserId);

    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + INVITE_TTL_HOURS);

    // Purger les tokens expirés avant d'en ajouter un nouveau
    household.inviteTokens = household.inviteTokens.filter(
      (t) => t.expiresAt > new Date() && !t.usedBy,
    );

    household.inviteTokens.push({ token, expiresAt });
    await household.save();

    return token;
  }

  /** Rejoindre un foyer via un token d'invitation */
  async joinWithToken(dto: JoinHouseholdDto, userId: string): Promise<HouseholdDocument> {
    const household = await this.householdModel.findOne({ 'inviteTokens.token': dto.token }).exec();

    if (!household) {
      throw new NotFoundException("Token d'invitation invalide ou expiré");
    }

    const invite = household.inviteTokens.find((t) => t.token === dto.token);

    if (!invite) {
      throw new NotFoundException("Token d'invitation invalide");
    }
    if (invite.expiresAt < new Date()) {
      throw new BadRequestException("Token d'invitation expiré");
    }
    if (invite.usedBy) {
      throw new ConflictException("Token d'invitation déjà utilisé");
    }

    if (household.memberIds.includes(userId)) {
      throw new ConflictException('Vous êtes déjà membre de ce foyer');
    }

    // Marquer le token comme utilisé + ajouter le membre
    invite.usedBy = userId;
    household.memberIds.push(userId);
    household.markModified('inviteTokens');

    return household.save();
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private assertOwner(household: HouseholdDocument, userId: string): void {
    if (household.ownerId !== userId) {
      throw new ForbiddenException('Seul le propriétaire peut effectuer cette action');
    }
  }

  /**
   * Vérifie que le nom n'est pas déjà pris (case-insensitive).
   * @param excludeId  ID du foyer à exclure (utile lors d'un renommage).
   */
  private async assertNameAvailable(name: string, excludeId?: string): Promise<void> {
    const filter: Record<string, unknown> = {
      name: { $regex: `^${name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    };
    if (excludeId) {
      filter['_id'] = { $ne: excludeId };
    }
    const existing = await this.householdModel.findOne(filter).exec();
    if (existing) {
      throw new ConflictException(`Le nom de foyer "${name.trim()}" est déjà utilisé`);
    }
  }
}
