import mongoose from 'mongoose';
import crypto from 'crypto';

const invitationSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: [true, 'Trip reference is required'],
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Invitee email is required'],
      lowercase: true,
      trim: true,
      index: true,
    },
    inviter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Inviter reference is required'],
    },
    role: {
      type: String,
      enum: ['organizer', 'editor', 'viewer'],
      default: 'editor',
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'revoked', 'expired'],
      default: 'pending',
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to help query active invitations for a trip and email
invitationSchema.index({ trip: 1, email: 1, status: 1 });

/**
 * Generate a cryptographically secure token and its SHA-256 hash.
 */
invitationSchema.statics.generateInvitationToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  return { token, tokenHash, expiresAt };
};

/**
 * Hash a plain token to compare against stored tokenHash.
 */
invitationSchema.statics.hashToken = function (token) {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Check if the invitation has expired.
 */
invitationSchema.methods.isExpired = function () {
  return this.expiresAt < new Date();
};

export const Invitation = mongoose.model('Invitation', invitationSchema);
export default Invitation;
