import crypto from 'crypto';
import { z } from 'zod';
import Invitation from '../models/Invitation.js';
import Trip from '../models/Trip.js';
import User from '../models/User.js';
import emailService from '../utils/emailService.js';
import { logTripActivity } from '../services/activityService.js';
import { createNotification } from '../services/notificationService.js';
import { getClientUrl } from '../utils/urlHelper.js';

const inviteSchema = z.object({
  email: z.string().trim().email('Please provide a valid email address').toLowerCase(),
  role: z.enum(['organizer', 'editor', 'viewer']).default('editor'),
});

/**
 * @route   POST /api/trips/:id/invitations
 * @desc    Invite a member to a trip by email
 * @access  Private (Owner or Organizer)
 */
export async function inviteMember(req, res, next) {
  try {
    const parseResult = inviteSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: parseResult.error.errors[0]?.message || 'Invalid invitation data',
      });
    }

    const { email, role } = parseResult.data;
    const tripId = req.params.id;

    // Find trip
    const trip = await Trip.findById(tripId).populate('owner', 'name email');
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    // Permission check: only owner or organizer can invite members
    const isOwner = trip.owner._id.toString() === req.user._id.toString();
    const userMember = trip.members.find(
      (m) => m.user.toString() === req.user._id.toString() && m.role === 'organizer'
    );

    if (!isOwner && !userMember) {
      return res.status(403).json({
        success: false,
        message: 'Only the trip owner or organizers can invite companions',
      });
    }

    // Prevent inviting oneself if current user is owner
    if (email === req.user.email.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: 'You are already the owner/organizer of this trip',
      });
    }

    // Check if user is already a member
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const isAlreadyMember = trip.members.some(
        (m) => m.user.toString() === existingUser._id.toString() && m.status === 'accepted'
      );
      if (isAlreadyMember) {
        return res.status(400).json({
          success: false,
          message: `${email} is already an active member of this trip`,
        });
      }
    }

    // Check for existing pending invitation (prevent duplicate pending invitations)
    const existingPending = await Invitation.findOne({
      trip: tripId,
      email,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    });

    if (existingPending) {
      return res.status(400).json({
        success: false,
        message: `A pending invitation has already been sent to ${email}`,
      });
    }

    // Generate token and create invitation
    const { token, tokenHash, expiresAt } = Invitation.generateInvitationToken();

    const invitation = await Invitation.create({
      trip: tripId,
      email,
      inviter: req.user._id,
      role: role || 'editor',
      tokenHash,
      status: 'pending',
      expiresAt,
    });

    // Construct accept URL for the email
    const clientUrl = getClientUrl(req);
    const inviteUrl = `${clientUrl}/invitations?token=${token}`;

    // Send invitation email via nodemailer / dev logger
    await emailService.sendTripInvitationEmail({
      to: email,
      inviterName: req.user.name || 'A traveler',
      tripTitle: trip.title,
      destination: trip.destination,
      inviteUrl,
      role,
      expiresAt,
    });

    const isDevelopment = process.env.NODE_ENV !== 'production';

    // Log trip activity
    await logTripActivity({
      tripId,
      actorId: req.user._id,
      action: 'member_invite',
      entityType: 'member',
      entityId: invitation._id,
      summary: `Invited ${email} as ${role || 'editor'}`,
      metadata: { email, role: role || 'editor' },
    });

    // If an existing registered user matches the invited email, send an in-app notification
    const existingRegisteredUser = await User.findOne({ email });
    if (existingRegisteredUser) {
      await createNotification({
        recipientId: existingRegisteredUser._id,
        senderId: req.user._id,
        tripId: trip._id,
        type: 'trip_invitation',
        title: `Trip Invitation: ${trip.title}`,
        message: `${req.user.name || 'A traveler'} invited you to join "${trip.title}" (${trip.destination}) as an ${role || 'editor'}.`,
        link: '/invitations',
        metadata: {
          tripTitle: trip.title,
          destination: trip.destination,
          role: role || 'editor',
        },
        sendEmailIfAllowed: false, // Already sent invite email above
      });
    }

    return res.status(201).json({
      success: true,
      message: `Invitation successfully sent to ${email}`,
      invitation: {
        _id: invitation._id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
      },
      ...(isDevelopment && {
        devToken: token,
        devInviteUrl: inviteUrl,
      }),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @route   GET /api/trips/:id/invitations
 * @desc    Get all invitations for a specific trip
 * @access  Private (Trip members only)
 */
export async function getTripInvitations(req, res, next) {
  try {
    const tripId = req.params.id;
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    // Permission check: must be owner or member
    const isOwner = trip.owner.toString() === req.user._id.toString();
    const isMember = trip.members.some((m) => m.user.toString() === req.user._id.toString());
    if (!isOwner && !isMember) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Auto-update expired invitations
    await Invitation.updateMany(
      {
        trip: tripId,
        status: 'pending',
        expiresAt: { $lt: new Date() },
      },
      { status: 'expired' }
    );

    const invitations = await Invitation.find({ trip: tripId })
      .populate('inviter', 'name email avatar')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      invitations,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @route   DELETE /api/trips/:id/invitations/:invitationId
 * @desc    Revoke a pending trip invitation
 * @access  Private (Owner or Organizer)
 */
export async function revokeInvitation(req, res, next) {
  try {
    const { id: tripId, invitationId } = req.params;

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    const isOwner = trip.owner.toString() === req.user._id.toString();
    const isOrganizer = trip.members.some(
      (m) => m.user.toString() === req.user._id.toString() && m.role === 'organizer'
    );

    if (!isOwner && !isOrganizer) {
      return res.status(403).json({
        success: false,
        message: 'Only the trip owner or organizers can revoke invitations',
      });
    }

    const invitation = await Invitation.findOne({ _id: invitationId, trip: tripId });
    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Invitation not found' });
    }

    invitation.status = 'revoked';
    await invitation.save();

    return res.status(200).json({
      success: true,
      message: 'Invitation has been revoked',
      invitation,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @route   DELETE /api/trips/:id/members/:userId
 * @desc    Remove a member from a trip
 * @access  Private (Owner only, or member removing self)
 */
export async function removeMember(req, res, next) {
  try {
    const { id: tripId, userId } = req.params;

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    const isOwner = trip.owner.toString() === req.user._id.toString();
    const isSelf = req.user._id.toString() === userId;

    // Cannot remove trip owner
    if (trip.owner.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'Trip owner cannot be removed. Transfer ownership or delete trip instead.',
      });
    }

    if (!isOwner && !isSelf) {
      return res.status(403).json({
        success: false,
        message: 'Only the trip owner can remove other members',
      });
    }

    const memberExists = trip.members.some((m) => m.user.toString() === userId);
    if (!memberExists) {
      return res.status(404).json({ success: false, message: 'User is not a member of this trip' });
    }

    trip.members = trip.members.filter((m) => m.user.toString() !== userId);
    await trip.save();

    // Log trip activity
    await logTripActivity({
      tripId,
      actorId: req.user._id,
      action: 'member_remove',
      entityType: 'member',
      entityId: userId,
      summary: isSelf ? 'Left the trip' : 'Removed a member from the trip',
    });

    return res.status(200).json({
      success: true,
      message: isSelf ? 'You have left the trip' : 'Member removed from trip',
      members: trip.members,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @route   PATCH /api/trips/:id/members/:userId/role
 * @desc    Update a member's role (organizer, editor, viewer)
 * @access  Private (Owner only)
 */
export async function updateMemberRole(req, res, next) {
  try {
    const { id: tripId, userId } = req.params;
    const { role } = req.body;

    if (!['organizer', 'editor', 'viewer'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role specified' });
    }

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    // Only owner can update roles
    if (trip.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the trip owner can change member roles',
      });
    }

    // Cannot change owner's role
    if (trip.owner.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify the owner role',
      });
    }

    const member = trip.members.find((m) => m.user.toString() === userId);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found on this trip' });
    }

    member.role = role;
    await trip.save();

    return res.status(200).json({
      success: true,
      message: `Member role updated to ${role}`,
      member,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @route   GET /api/invitations/me
 * @desc    Get all pending invitations sent to current user's email
 * @access  Private
 */
export async function getMyInvitations(req, res, next) {
  try {
    const userEmail = req.user.email.toLowerCase();

    // Auto-expire outdated invitations
    await Invitation.updateMany(
      {
        email: userEmail,
        status: 'pending',
        expiresAt: { $lt: new Date() },
      },
      { status: 'expired' }
    );

    const invitations = await Invitation.find({
      email: userEmail,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    })
      .populate('trip', 'title destination coverImage startDate endDate budget currency status')
      .populate('inviter', 'name email avatar')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: invitations.length,
      invitations,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @route   GET /api/invitations/token/:token
 * @desc    Verify invitation token and fetch trip info
 * @access  Public / Private
 */
export async function getInvitationByToken(req, res, next) {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Invitation token is required' });
    }

    const tokenHash = Invitation.hashToken(token);
    const invitation = await Invitation.findOne({ tokenHash })
      .populate('trip', 'title destination coverImage startDate endDate status')
      .populate('inviter', 'name email avatar');

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invalid invitation link',
      });
    }

    if (invitation.isExpired() || invitation.status === 'expired') {
      invitation.status = 'expired';
      await invitation.save();
      return res.status(410).json({
        success: false,
        message: 'This invitation has expired',
        status: 'expired',
      });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `This invitation has already been ${invitation.status}`,
        status: invitation.status,
      });
    }

    return res.status(200).json({
      success: true,
      invitation,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @route   POST /api/invitations/token/:token/accept
 * @desc    Accept invitation using token
 * @access  Private
 */
export async function acceptInvitationByToken(req, res, next) {
  try {
    const { token } = req.params;
    const tokenHash = Invitation.hashToken(token);

    const invitation = await Invitation.findOne({ tokenHash });
    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Invalid invitation token' });
    }

    if (invitation.isExpired() || invitation.status === 'expired') {
      invitation.status = 'expired';
      await invitation.save();
      return res.status(410).json({ success: false, message: 'This invitation has expired' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `This invitation has already been ${invitation.status}`,
      });
    }

    const trip = await Trip.findById(invitation.trip);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Associated trip no longer exists' });
    }

    // Check if user is already a member
    const existingMember = trip.members.find(
      (m) => m.user.toString() === req.user._id.toString()
    );

    if (existingMember) {
      invitation.status = 'accepted';
      await invitation.save();
      return res.status(200).json({
        success: true,
        message: 'You are already a companion on this trip',
        trip,
      });
    }

    // Add user as member
    trip.members.push({
      user: req.user._id,
      role: invitation.role || 'editor',
      status: 'accepted',
      joinedAt: new Date(),
    });

    await trip.save();

    // Mark invitation accepted (prevents token reuse)
    invitation.status = 'accepted';
    await invitation.save();

    // Log trip activity
    await logTripActivity({
      tripId: trip._id,
      actorId: req.user._id,
      action: 'member_join',
      entityType: 'member',
      entityId: req.user._id,
      summary: `${req.user.name || 'Traveler'} joined the trip`,
    });

    return res.status(200).json({
      success: true,
      message: `You have successfully joined "${trip.title}"!`,
      trip,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @route   POST /api/invitations/token/:token/decline
 * @desc    Decline invitation using token
 * @access  Private / Public
 */
export async function declineInvitationByToken(req, res, next) {
  try {
    const { token } = req.params;
    const tokenHash = Invitation.hashToken(token);

    const invitation = await Invitation.findOne({ tokenHash });
    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Invalid invitation token' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `This invitation is already ${invitation.status}`,
      });
    }

    invitation.status = 'declined';
    await invitation.save();

    return res.status(200).json({
      success: true,
      message: 'Invitation declined',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @route   POST /api/invitations/:id/accept
 * @desc    Accept invitation by Invitation ID (for current logged in user)
 * @access  Private
 */
export async function acceptInvitationById(req, res, next) {
  try {
    const { id } = req.params;
    const invitation = await Invitation.findById(id);

    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Invitation not found' });
    }

    // Verify email matches current user
    if (invitation.email.toLowerCase() !== req.user.email.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'This invitation was addressed to a different email address',
      });
    }

    if (invitation.isExpired() || invitation.status === 'expired') {
      invitation.status = 'expired';
      await invitation.save();
      return res.status(410).json({ success: false, message: 'This invitation has expired' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `This invitation is already ${invitation.status}`,
      });
    }

    const trip = await Trip.findById(invitation.trip);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Associated trip not found' });
    }

    // Add user as member if not already
    const isMember = trip.members.some((m) => m.user.toString() === req.user._id.toString());
    if (!isMember) {
      trip.members.push({
        user: req.user._id,
        role: invitation.role || 'editor',
        status: 'accepted',
        joinedAt: new Date(),
      });
      await trip.save();
    }

    invitation.status = 'accepted';
    await invitation.save();

    return res.status(200).json({
      success: true,
      message: `You have accepted the invitation to "${trip.title}"!`,
      trip,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @route   POST /api/invitations/:id/decline
 * @desc    Decline invitation by Invitation ID
 * @access  Private
 */
export async function declineInvitationById(req, res, next) {
  try {
    const { id } = req.params;
    const invitation = await Invitation.findById(id);

    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Invitation not found' });
    }

    if (invitation.email.toLowerCase() !== req.user.email.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'This invitation was addressed to a different email address',
      });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `This invitation is already ${invitation.status}`,
      });
    }

    invitation.status = 'declined';
    await invitation.save();

    return res.status(200).json({
      success: true,
      message: 'Invitation declined',
    });
  } catch (err) {
    next(err);
  }
}
