import { useState } from 'react';
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
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import api from '../services/api';

interface AddActivityDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
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

const completionOutcomes = [
  { value: 'COMPLETED_OK', label: 'Completed OK' },
  { value: 'NO_SHOW', label: 'No Show' },
  { value: 'DID_NOT_ANSWER', label: 'Did Not Answer' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'FAILED', label: 'Failed' },
];

export default function AddActivityDialog({ open, onClose, onSuccess }: AddActivityDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [mode, setMode] = useState<'scheduled' | 'recorded'>('scheduled');
  const [formData, setFormData] = useState({
    title: '',
    activityType: 'MEETING',
    scheduledAt: '',
    recordedAt: '',
    completionOutcome: 'COMPLETED_OK',
    notes: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleModeChange = (_: React.MouseEvent<HTMLElement>, newMode: 'scheduled' | 'recorded' | null) => {
    if (newMode !== null) {
      setMode(newMode);
      setError('');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      const payload: any = {
        activityType: formData.activityType,
        notes: formData.notes || undefined,
      };

      if (mode === 'scheduled') {
        if (!formData.title) {
          setError('Title is required for scheduled activities');
          setLoading(false);
          return;
        }
        if (!formData.scheduledAt) {
          setError('Scheduled date is required');
          setLoading(false);
          return;
        }
        payload.title = formData.title;
        payload.scheduledAt = new Date(formData.scheduledAt).toISOString();
      } else {
        if (!formData.recordedAt) {
          setError('Recorded date is required');
          setLoading(false);
          return;
        }
        payload.recordedAt = new Date(formData.recordedAt).toISOString();
        payload.completionOutcome = formData.completionOutcome;
      }

      await api.post('/activities', payload);
      
      // Reset form
      setFormData({
        title: '',
        activityType: 'MEETING',
        scheduledAt: '',
        recordedAt: '',
        completionOutcome: 'COMPLETED_OK',
        notes: '',
      });
      
      enqueueSnackbar(`Activity ${mode === 'scheduled' ? 'scheduled' : 'recorded'} successfully!`, { variant: 'success' });
      onSuccess();
      onClose();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to create activity';
      setError(errorMessage);
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError('');
    setFormData({
      title: '',
      activityType: 'MEETING',
      scheduledAt: '',
      recordedAt: '',
      completionOutcome: 'COMPLETED_OK',
      notes: '',
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Activity</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={handleModeChange}
            fullWidth
            sx={{ mb: 3 }}
          >
            <ToggleButton value="scheduled">Scheduled</ToggleButton>
            <ToggleButton value="recorded">Recorded</ToggleButton>
          </ToggleButtonGroup>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {mode === 'scheduled' && (
            <>
              <TextField
                margin="normal"
                required
                fullWidth
                id="title"
                label="Title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                disabled={loading}
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
                disabled={loading}
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
                label="Scheduled Date & Time"
                name="scheduledAt"
                type="datetime-local"
                value={formData.scheduledAt}
                onChange={handleChange}
                disabled={loading}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </>
          )}

          {mode === 'recorded' && (
            <>
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
                disabled={loading}
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
                id="recordedAt"
                label="Recorded Date & Time"
                name="recordedAt"
                type="datetime-local"
                value={formData.recordedAt}
                onChange={handleChange}
                disabled={loading}
                InputLabelProps={{
                  shrink: true,
                }}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                select
                id="completionOutcome"
                label="Completion Outcome"
                name="completionOutcome"
                value={formData.completionOutcome}
                onChange={handleChange}
                disabled={loading}
              >
                {completionOutcomes.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </>
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
            disabled={loading}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? 'Creating...' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
