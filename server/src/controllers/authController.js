import crypto from 'crypto';
import * as z from 'zod';
import User from '../models/User.js';
import { sendTokenResponse, clearTokenResponse } from '../middleware/auth.js';
import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';
import { getClientUrl } from '../utils/urlHelper.js';

// Zod Validation Schemas
export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60, 'Name cannot exceed 60 characters'),
  email: z.string().trim().email('Please enter a valid email address').toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password confirmation must be at least 6 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60, 'Name cannot exceed 60 characters'),
  avatar: z.string().optional().or(z.literal('')),
  bio: z.string().max(240, 'Bio cannot exceed 240 characters').optional().or(z.literal('')),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address').toLowerCase(),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password confirmation must be at least 6 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

/**
 * @route   POST /api/auth/register
 * @desc    Register new user, set HTTP-only cookie & return user
 * @access  Public
 */
export async function register(req, res, next) {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors[0]?.message || 'Invalid registration details';
      return res.status(400).json({ success: false, message: errorMsg, errors: parseResult.error.flatten().fieldErrors });
    }

    const { name, email, password } = parseResult.data;

    // Check for duplicate normalized email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists. Please sign in instead.',
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
    });

    return sendTokenResponse(user, 201, res, 'Registration successful. Welcome to TripTally!');
  } catch (err) {
    next(err);
  }
}

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & set HTTP-only cookie
 * @access  Public
 */
export async function login(req, res, next) {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors[0]?.message || 'Please provide valid email and password';
      return res.status(400).json({ success: false, message: errorMsg });
    }

    const { email, password } = parseResult.data;

    // Explicitly select password field to check hash
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password. Please check your credentials.',
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password. Please check your credentials.',
      });
    }

    return sendTokenResponse(user, 200, res, 'Signed in successfully. Welcome back!');
  } catch (err) {
    next(err);
  }
}

/**
 * @route   POST /api/auth/logout
 * @desc    Clear HTTP-only cookie and logout
 * @access  Public
 */
export function logout(req, res) {
  return clearTokenResponse(res);
}

/**
 * @route   GET /api/auth/me
 * @desc    Get currently logged in user from verified session
 * @access  Private (protect middleware)
 */
export function getMe(req, res) {
  return res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      avatar: req.user.avatar || '',
      bio: req.user.bio || '',
      createdAt: req.user.createdAt,
    },
  });
}

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile (name, avatar, bio)
 * @access  Private (protect middleware)
 */
export async function updateProfile(req, res, next) {
  try {
    const parseResult = updateProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors[0]?.message || 'Invalid profile information';
      return res.status(400).json({ success: false, message: errorMsg });
    }

    const { name, avatar, bio } = parseResult.data;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.name = name;
    if (avatar !== undefined) user.avatar = avatar;
    if (bio !== undefined) user.bio = bio;

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar || '',
        bio: user.bio || '',
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @route   POST /api/auth/profile/avatar
 * @desc    Upload profile photo / avatar
 * @access  Private (protect middleware)
 */
export async function uploadAvatar(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select an image file to upload' });
    }

    let avatarUrl = `/uploads/avatars/${req.file.filename}`;

    if (isCloudinaryConfigured) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'triptally/avatars',
          transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
        });
        if (result?.secure_url) {
          avatarUrl = result.secure_url;
        }
      } catch (cloudErr) {
        console.warn('[Cloudinary] Avatar upload fallback to local storage:', cloudErr.message);
      }
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.avatar = avatarUrl;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile photo updated successfully',
      avatarUrl,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar || '',
        bio: user.bio || '',
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Generate password reset token
 * @access  Public
 */
export async function forgotPassword(req, res, next) {
  try {
    const parseResult = forgotPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    }

    const { email } = parseResult.data;
    const user = await User.findOne({ email });

    // For privacy/security, even if user doesn't exist, return a uniform success message
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists for that email, a password reset link has been dispatched.',
      });
    }

    // Get reset token and save hash
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const clientUrl = getClientUrl(req);
    const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

    console.log(`[Auth] Password reset token generated for ${user.email}:`);
    console.log(`[Auth] Reset URL: ${resetUrl}`);

    // Return reset token in development mode for easy testing
    const isDevelopment = process.env.NODE_ENV !== 'production';

    return res.status(200).json({
      success: true,
      message: 'If an account exists for that email, a password reset link has been dispatched.',
      ...(isDevelopment && {
        devResetToken: resetToken,
        devResetUrl: resetUrl,
      }),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @route   PUT /api/auth/reset-password/:resetToken
 * @desc    Reset password using valid reset token
 * @access  Public
 */
export async function resetPassword(req, res, next) {
  try {
    const parseResult = resetPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors[0]?.message || 'Invalid password requirements';
      return res.status(400).json({ success: false, message: errorMsg });
    }

    const { resetToken } = req.params;
    if (!resetToken) {
      return res.status(400).json({ success: false, message: 'Reset token is required' });
    }

    // Hash the token from url params to match DB hash
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Password reset link is invalid or has expired. Please request a new one.',
      });
    }

    // Set new password
    user.password = parseResult.data.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    return sendTokenResponse(user, 200, res, 'Password has been reset successfully. You are now signed in.');
  } catch (err) {
    next(err);
  }
}
