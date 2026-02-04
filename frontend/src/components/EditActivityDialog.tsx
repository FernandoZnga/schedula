import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Alert,
  Chip,
  DialogContentText,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import api from '../services/api';

interface Activity {
  id: string;
  title: string;
  notes?: string;
  activityType: string;
  scheduledAt?: string;
  recordedAt?: string;
  completionOutcome?: string;
  deletedAt?: string;
}

interface EditActivityDialogProps {
  open: boolean;
  activity: Activity | null;
  onClose: () => void;
  onSuccess: () => void;
  onCompleteClick?: (activity: Activity) => void;
}

const activityTypes = [
  { value: 'DOCTOR_APPOINTMENT', label: 'Doctor Appointment' },
  { value: 'CALL', label: 'Call' },
  { value: 'MEETING', label: 'Meeting' },
  { value: 'GYM', label: 'Gym' },
  { value: 'GROCERY_RUN', label: 'Grocery Run' },
  { value: 'STUDY_SESSION', label: 'Study Session' },
  { value: 'PAY_BILLS', label: 'Pay Bills' },
  { value: 'CAR_MAINTENANCE', label: 'Car Maintenance' },
  { value: 'DENTIST_APPOINTMENT', label: 'Dentist Appointment' },
  { value: 'HAIRCUT', label: 'Haircut' },
  { value: 'WORKOUT', label: 'Workout' },
  { value: 'LUNCH_MEETING', label: 'Lunch Meeting' },
  { value: 'TEAM_STANDUP', label: 'Team Standup' },
  { value: 'CLIENT_CALL', label: 'Client Call' },
  { value: 'PERSONAL_TIME', label: 'Personal Time' },
  { value: 'OTHER', label: 'Other' },
];

export default function EditActivityDialog({ open, activity, onClose, onSuccess, onCompleteClick }: EditActivityDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [formData, setFormData] = useState({
    title: '',
    activityType: 'MEETING',
    scheduledAt: '',
    notes: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const isScheduled = activity?.scheduledAt && !activity?.recordedAt;
  const isRecorded = !!activity?.recordedAt;

  useEffect(() => {
    if (activity) {
      // Convert ISO string to datetime-local format
      const scheduledDate = activity.scheduledAt
        ? new Date(activity.scheduledAt).toISOString().slice(0, 16)
        : '';

      setFormData({
        title: activity.title || '',
        activityType: activity.activityType,
        scheduledAt: scheduledDate,
        notes: activity.notes || '',
      });
    }
  }, [activity]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    if (!activity || isRecorded) return;

    setError('');
    setLoading(true);

    try {
      if (!formData.title) {
        setError('Title is required');
        setLoading(false);
        return;
      }

      if (!formData.scheduledAt) {
        setError('Scheduled date is required');
        setLoading(false);
        return;
      }

      await api.patch(`/activities/${activity.id}`, {
        title: formData.title,
        scheduledAt: new Date(formData.scheduledAt).toISOString(),
        notes: formData.notes || undefined,
      });

      enqueueSnackbar('Activity updated successfully!', { variant: 'success' });
      onSuccess();
      onClose();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to update activity';
      setError(errorMessage);
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError('');
    onClose();
  };

  const handleDeleteClick = () => {
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!activity) return;

    setLoading(true);
    try {
      const reason = isScheduled ? 'Cancelled by user' : 'Deleted by user';
      await api.delete(`/activities/${activity.id}`, {
        data: { reason },
      });

      enqueueSnackbar(`Activity ${isScheduled ? 'cancelled' : 'deleted'} successfully!`, { variant: 'success' });
      setDeleteConfirmOpen(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to delete activity';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
  };

  if (!activity) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isRecorded ? 'View Activity' : 'Edit Activity'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {isRecorded && (
            <Alert severity="info" sx={{ mb: 2 }}>
              This activity has been completed and cannot be edited.
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            margin="normal"
            required
            fullWidth
            id="title"
            label="Title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            disabled={loading || isRecorded}
            InputProps={{
              readOnly: isRecorded,
            }}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            select
            id="activityType"
            label="Activity Type"
            name="activityType"
            value={formData.activityType}
            onChange={handleChange}
            disabled={true}
            InputProps={{
              readOnly: true,
            }}
          >
            {activityTypes.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            margin="normal"
            required
            fullWidth
            id="scheduledAt"
            label={isRecorded ? 'Was Scheduled For' : 'Scheduled Date & Time'}
            name="scheduledAt"
            type="datetime-local"
            value={formData.scheduledAt}
            onChange={handleChange}
            disabled={loading || isRecorded}
            InputLabelProps={{
              shrink: true,
            }}
            InputProps={{
              readOnly: isRecorded,
            }}
          />

          {isRecorded && activity.recordedAt && (
            <TextField
              margin="normal"
              fullWidth
              id="recordedAt"
              label="Completed At"
              value={new Date(activity.recordedAt).toISOString().slice(0, 16)}
              disabled
              type="datetime-local"
              InputLabelProps={{
                shrink: true,
              }}
            />
          )}

          {isRecorded && activity.completionOutcome && (
            <Box sx={{ mt: 2, mb: 1 }}>
              <Chip
                label={`Outcome: ${activity.completionOutcome.replace(/_/g, ' ')}`}
                color={activity.completionOutcome === 'COMPLETED_OK' ? 'success' : 'default'}
              />
            </Box>
          )}

          <TextField
            margin="normal"
            fullWidth
            id="notes"
            label="Notes"
            name="notes"
            multiline
            rows={3}
            value={formData.notes}
            onChange={handleChange}
            disabled={loading || isRecorded}
            InputProps={{
              readOnly: isRecorded,
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
          <Button 
            onClick={handleDeleteClick} 
            color="error"
            disabled={loading}
          >
            {isScheduled ? 'Cancel Activity' : 'Delete'}
          </Button>
          <Box>
            <Button onClick={handleClose} disabled={loading} sx={{ mr: 1 }}>
              {isRecorded ? 'Close' : 'Cancel'}
            </Button>
            {isScheduled && onCompleteClick && (
              <Button 
                onClick={() => {
                  if (activity) {
                    onCompleteClick(activity);
                  }
                }} 
                variant="outlined" 
                color="success"
                disabled={loading}
                sx={{ mr: 1 }}
              >
                Complete Activity
              </Button>
            )}
            {!isRecorded && (
              <Button onClick={handleSubmit} variant="contained" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </Box>
        </Box>
      </DialogActions>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel}>
        <DialogTitle>
          {isScheduled ? 'Cancel Activity?' : 'Delete Activity?'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to {isScheduled ? 'cancel' : 'delete'} this activity? 
            This action can be undone by showing deleted/cancelled activities.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={loading}>
            No, Keep It
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={loading}>
            {loading ? 'Processing...' : `Yes, ${isScheduled ? 'Cancel' : 'Delete'}`}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
