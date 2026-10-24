import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function protect(req, res, next) {
  let token;

  // 1. Check HTTP-only cookie first (preferred)
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // 2. Check Authorization Bearer header as fallback
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please sign in.',
    });
  }

  try {
    const secret = process.env.JWT_SECRET || 'supersecret_triptally_dev_key_change_in_production';
    const decoded = jwt.verify(token, secret);

    // Fetch user from DB and attach to req.user (excluding password)
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this session no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Your session has expired or is invalid. Please sign in again.',
    });
  }
}

/**
 * Signs JWT token, sets secure HTTP-only cookie, and sends sanitized user response
 */
export function sendTokenResponse(user, statusCode, res, message = 'Authenticated successfully') {
  const secret = process.env.JWT_SECRET || 'supersecret_triptally_dev_key_change_in_production';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  const token = jwt.sign(
    { id: user._id, email: user.email, name: user.name },
    secret,
    { expiresIn }
  );

  const isProduction = process.env.NODE_ENV === 'production';

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  };

  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      message,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar || '',
        bio: user.bio || '',
        createdAt: user.createdAt,
      },
    });
}

/**
 * Clears HTTP-only authentication cookie on logout
 */
export function clearTokenResponse(res) {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('token', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    expires: new Date(0), // Expire immediately
    path: '/',
  });

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
}
