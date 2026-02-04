import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  createScheduledActivitySchema,
  createRecordedActivitySchema,
  updateActivitySchema,
  completeActivitySchema,
  deleteActivitySchema,
  getActivitiesSchema,
} from '../utils/validation';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /activities
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = getActivitiesSchema.parse(req.query);
    const userId = req.user!.userId;

    const includeDeleted = query.includeDeleted === 'true';
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;

    const where: any = {
      userId,
      ...(includeDeleted ? {} : { deletedAt: null }),
    };

    if (from || to) {
      where.OR = [
        {
          scheduledAt: {
            ...(from && { gte: from }),
            ...(to && { lte: to }),
          },
        },
        {
          recordedAt: {
            ...(from && { gte: from }),
            ...(to && { lte: to }),
          },
        },
      ];
    }

    const activities = await prisma.activity.findMany({
      where,
      orderBy: [
        { scheduledAt: 'asc' },
        { recordedAt: 'desc' },
      ],
    });

    // Separate scheduled and recorded
    const scheduled = activities.filter(a => a.scheduledAt && !a.recordedAt);
    const recorded = activities.filter(a => a.recordedAt);

    // Calculate stats
    const stats = {
      total: activities.filter(a => !a.deletedAt).length,
      open: scheduled.filter(a => !a.deletedAt).length,
      completed: recorded.filter(a => !a.deletedAt).length,
    };

    res.json({ activities, stats });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Get activities error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /activities
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Determine if this is scheduled or recorded
    const isScheduled = req.body.scheduledAt && !req.body.recordedAt;
    const isRecorded = req.body.recordedAt;

    if (isScheduled) {
      const body = createScheduledActivitySchema.parse(req.body);
      const scheduledDate = new Date(body.scheduledAt);

      // Validate future date
      if (scheduledDate <= new Date()) {
        return res.status(400).json({ error: 'Scheduled activities must be in the future' });
      }

      const activity = await prisma.activity.create({
        data: {
          userId,
          title: body.title,
          notes: body.notes,
          activityType: body.activityType,
          scheduledAt: scheduledDate,
        },
      });

      return res.status(201).json(activity);
    } else if (isRecorded) {
      const body = createRecordedActivitySchema.parse(req.body);
      const recordedDate = new Date(body.recordedAt);

      // Validate past date
      if (recordedDate >= new Date()) {
        return res.status(400).json({ error: 'Recorded activities must be in the past' });
      }

      const activity = await prisma.activity.create({
        data: {
          userId,
          activityType: body.activityType,
          recordedAt: recordedDate,
          completionOutcome: body.completionOutcome,
          notes: body.notes,
        },
      });

      return res.status(201).json(activity);
    } else {
      return res.status(400).json({ error: 'Activity must be either scheduled or recorded' });
    }
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Create activity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /activities/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const body = updateActivitySchema.parse(req.body);

    const activity = await prisma.activity.findFirst({
      where: { id, userId },
    });

    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    // If updating scheduledAt, validate it's still in the future
    if (body.scheduledAt) {
      const newScheduledDate = new Date(body.scheduledAt);
      if (newScheduledDate <= new Date()) {
        return res.status(400).json({ error: 'Scheduled date must be in the future' });
      }
    }

    const updated = await prisma.activity.update({
      where: { id },
      data: {
        title: body.title,
        notes: body.notes,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      },
    });

    res.json(updated);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Update activity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /activities/:id/complete
router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const body = completeActivitySchema.parse(req.body);

    const activity = await prisma.activity.findFirst({
      where: { id, userId },
    });

    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    if (!activity.scheduledAt) {
      return res.status(400).json({ error: 'Only scheduled activities can be completed' });
    }

    const completionDate = new Date(body.completionDate);

    // Validate completion date is in the past
    if (completionDate >= new Date()) {
      return res.status(400).json({ error: 'Completion date must be in the past' });
    }

    const updated = await prisma.activity.update({
      where: { id },
      data: {
        recordedAt: completionDate,
        completionOutcome: body.completionOutcome,
      },
    });

    res.json(updated);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Complete activity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /activities/:id (soft delete)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const body = deleteActivitySchema.parse(req.body);

    const activity = await prisma.activity.findFirst({
      where: { id, userId },
    });

    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    const updated = await prisma.activity.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedReason: body.reason,
      },
    });

    res.json({ message: 'Activity deleted successfully', activity: updated });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Delete activity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
