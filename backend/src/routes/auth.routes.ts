import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../config/database';
import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/password';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateRandomToken,
  hashToken,
} from '../utils/jwt';
import { emailService } from '../services/email.service';
import {
  signupSchema,
  loginSchema,
  confirmEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
} from '../utils/validation';

const router = Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: 'Too many requests from this IP, please try again later',
});

// POST /auth/signup
router.post('/signup', authLimiter, async (req: Request, res: Response) => {
  try {
    const body = signupSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(body.password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    // Hash password
    const passwordHash = await hashPassword(body.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        firstName: body.firstName,
        lastName: body.lastName,
        status: 'WAITING_EMAIL_CONFIRMATION',
      },
    });

    // Save initial password to history
    await prisma.passwordHistory.create({
      data: {
        userId: user.id,
        passwordHash,
      },
    });

    // Generate email confirmation token
    const token = generateRandomToken();
    const tokenHash = hashToken(token);

    await prisma.emailToken.create({
      data: {
        userId: user.id,
        type: 'CONFIRM_EMAIL',
        tokenHash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // Send confirmation email
    await emailService.sendEmailConfirmation(user.email, token);

    res.status(201).json({
      message: 'User created successfully. Please check your email to confirm your account.',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/confirm-email
router.post('/confirm-email', async (req: Request, res: Response) => {
  try {
    const body = confirmEmailSchema.parse(req.body);
    const tokenHash = hashToken(body.token);

    const emailToken = await prisma.emailToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!emailToken) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    if (emailToken.usedAt) {
      return res.status(400).json({ error: 'Token already used' });
    }

    if (emailToken.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Token expired' });
    }

    if (emailToken.type !== 'CONFIRM_EMAIL') {
      return res.status(400).json({ error: 'Invalid token type' });
    }

    // Update user status and mark token as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: emailToken.userId },
        data: { status: 'ACTIVE' },
      }),
      prisma.emailToken.update({
        where: { id: emailToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    res.json({ message: 'Email confirmed successfully. You can now login.' });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Confirm email error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/login
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const body = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is blocked
    if (user.status === 'BLOCKED') {
      return res.status(403).json({ error: 'Account is blocked due to too many failed login attempts' });
    }

    // Check if email is confirmed
    if (user.status === 'WAITING_EMAIL_CONFIRMATION') {
      return res.status(403).json({ error: 'Please confirm your email before logging in' });
    }

    // Verify password
    const isPasswordValid = await comparePassword(body.password, user.passwordHash);

    if (!isPasswordValid) {
      // Increment failed attempts
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: user.failedLoginAttempts + 1,
          status: user.failedLoginAttempts + 1 >= 10 ? 'BLOCKED' : user.status,
        },
      });

      if (updatedUser.status === 'BLOCKED') {
        return res.status(403).json({
          error: 'Account blocked due to too many failed login attempts',
        });
      }

      return res.status(401).json({
        error: 'Invalid credentials',
        remainingAttempts: 10 - updatedUser.failedLoginAttempts,
      });
    }

    // Reset failed attempts on successful login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lastLoginAt: new Date(),
      },
    });

    // Generate tokens
    const accessToken = generateAccessToken({ userId: user.id, email: user.email });
    const refreshToken = generateRefreshToken({ userId: user.id, email: user.email });
    const refreshTokenHash = hashToken(refreshToken);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const body = refreshTokenSchema.parse(req.body);
    const tokenHash = hashToken(body.refreshToken);

    // Verify token
    let payload;
    try {
      payload = verifyRefreshToken(body.refreshToken);
    } catch {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Check if token exists in database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Generate new access token
    const accessToken = generateAccessToken({ userId: payload.userId, email: payload.email });

    res.json({ accessToken });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/logout
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const body = refreshTokenSchema.parse(req.body);
    const tokenHash = hashToken(body.refreshToken);

    // Revoke refresh token
    await prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/forgot-password
router.post('/forgot-password', authLimiter, async (req: Request, res: Response) => {
  try {
    const body = forgotPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });

    // Don't reveal if user exists or not
    if (!user) {
      return res.json({ message: 'If the email exists, a reset link has been sent.' });
    }

    // Generate reset token
    const token = generateRandomToken();
    const tokenHash = hashToken(token);

    await prisma.emailToken.create({
      data: {
        userId: user.id,
        type: 'RESET_PASSWORD',
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Send reset email
    await emailService.sendPasswordReset(user.email, token);

    res.json({ message: 'If the email exists, a reset link has been sent.' });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/reset-password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const body = resetPasswordSchema.parse(req.body);
    const tokenHash = hashToken(body.token);

    const emailToken = await prisma.emailToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!emailToken) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    if (emailToken.usedAt) {
      return res.status(400).json({ error: 'Token already used' });
    }

    if (emailToken.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Token expired' });
    }

    if (emailToken.type !== 'RESET_PASSWORD') {
      return res.status(400).json({ error: 'Invalid token type' });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(body.newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    // Check password history (last 5 passwords)
    const passwordHistory = await prisma.passwordHistory.findMany({
      where: { userId: emailToken.userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    for (const oldPassword of passwordHistory) {
      const isSamePassword = await comparePassword(body.newPassword, oldPassword.passwordHash);
      if (isSamePassword) {
        return res.status(400).json({ error: 'Cannot reuse any of your last 5 passwords' });
      }
    }

    // Hash new password
    const newPasswordHash = await hashPassword(body.newPassword);

    // Update password and add to history
    await prisma.$transaction([
      prisma.user.update({
        where: { id: emailToken.userId },
        data: { passwordHash: newPasswordHash },
      }),
      prisma.passwordHistory.create({
        data: {
          userId: emailToken.userId,
          passwordHash: newPasswordHash,
        },
      }),
      prisma.emailToken.update({
        where: { id: emailToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    res.json({ message: 'Password reset successfully' });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DEV ONLY: Unblock user endpoint
if (process.env.NODE_ENV === 'development') {
  router.post('/dev/unblock', async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      await prisma.user.update({
        where: { email },
        data: {
          status: 'ACTIVE',
          failedLoginAttempts: 0,
        },
      });

      res.json({ message: 'User unblocked successfully' });
    } catch (error) {
      console.error('Unblock error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
}

export default router;
