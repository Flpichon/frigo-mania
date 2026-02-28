import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type HouseholdDocument = Household & Document;

export class InviteToken {
  token: string; // UUID v4
  expiresAt: Date;
  usedBy?: string; // Keycloak user ID qui a utilisé ce token
}

@Schema({ timestamps: true })
export class Household {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: String, required: true })
  ownerId: string; // Keycloak user ID

  @Prop({ type: [String], default: [] })
  memberIds: string[]; // Keycloak user IDs (inclut le owner)

  @Prop({
    type: [
      {
        token: { type: String, required: true },
        expiresAt: { type: Date, required: true },
        usedBy: { type: String, default: null },
      },
    ],
    default: [],
  })
  inviteTokens: InviteToken[];
}

export const HouseholdSchema = SchemaFactory.createForClass(Household);

// Index unique case-insensitive sur le nom (collation fr/en)
HouseholdSchema.index({ name: 1 }, { unique: true, collation: { locale: 'fr', strength: 2 } });
// Index pour retrouver un foyer par token d'invitation
HouseholdSchema.index({ 'inviteTokens.token': 1 });
