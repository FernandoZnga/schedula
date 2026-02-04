import { z } from 'zod';

// Password validation schema
const passwordSchema = z.string().min(8).refine(
  (password) => {
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    return hasLetter && hasNumber && hasSymbol;
  },
  { message: 'Password must include letters, numbers, and symbols' }
);

// Auth validation schemas
export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: passwordSchema,
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const confirmEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: passwordSchema,
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Profile validation schemas
export const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name cannot be empty').optional(),
  lastName: z.string().min(1, 'Last name cannot be empty').optional(),
});

// Activity validation schemas
export const createScheduledActivitySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  notes: z.string().optional(),
  activityType: z.enum([
    'DOCTOR_APPOINTMENT',
    'CALL',
    'MEETING',
    'GYM',
    'GROCERY_RUN',
    'STUDY_SESSION',
    'PAY_BILLS',
    'CAR_MAINTENANCE',
    'DENTIST_APPOINTMENT',
    'HAIRCUT',
    'WORKOUT',
    'LUNCH_MEETING',
    'TEAM_STANDUP',
    'CLIENT_CALL',
    'PERSONAL_TIME',
    'OTHER',
  ]),
  scheduledAt: z.string().datetime(),
});

export const createRecordedActivitySchema = z.object({
  activityType: z.enum([
    'DOCTOR_APPOINTMENT',
    'CALL',
    'MEETING',
    'GYM',
    'GROCERY_RUN',
    'STUDY_SESSION',
    'PAY_BILLS',
    'CAR_MAINTENANCE',
    'DENTIST_APPOINTMENT',
    'HAIRCUT',
    'WORKOUT',
    'LUNCH_MEETING',
    'TEAM_STANDUP',
    'CLIENT_CALL',
    'PERSONAL_TIME',
    'OTHER',
  ]),
  recordedAt: z.string().datetime(),
  completionOutcome: z.enum([
    'COMPLETED_OK',
    'NO_SHOW',
    'DID_NOT_ANSWER',
    'CANCELLED',
    'FAILED',
  ]),
  notes: z.string().optional(),
});

export const updateActivitySchema = z.object({
  title: z.string().min(1).optional(),
  notes: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
});

export const completeActivitySchema = z.object({
  completionDate: z.string().datetime(),
  completionOutcome: z.enum([
    'COMPLETED_OK',
    'NO_SHOW',
    'DID_NOT_ANSWER',
    'CANCELLED',
    'FAILED',
  ]),
});

export const deleteActivitySchema = z.object({
  reason: z.string().min(1, 'Deletion reason is required'),
});

export const getActivitiesSchema = z.object({
  includeDeleted: z.enum(['true', 'false']).optional(),
  view: z.enum(['list', 'calendar']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
