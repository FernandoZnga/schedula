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
  Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import api from '../services/api';

interface Activity {
  id: string;
  title: string;
  activityType: string;
  scheduledAt?: string;
}

interface CompleteActivityDialogProps {
  open: boolean;
  activity: Activity | null;
  onClose: () => void;
  onSuccess: () => void;
}

const completionOutcomes = [
  { value: 'COMPLETED_OK', label: 'Completed OK' },
  { value: 'NO_SHOW', label: 'No Show' },
  { value: 'DID_NOT_ANSWER', label: 'Did Not Answer' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'FAILED', label: 'Failed' },
];

export default function CompleteActivityDialog({
  open,
  activity,
  onClose,
  onSuccess,
}: CompleteActivityDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [completionOutcome, setCompletionOutcome] = useState('COMPLETED_OK');
  const [completionDate, setCompletionDate] = useState(() => {
    // Default to current date/time
    return new Date().toISOString().slice(0, 16);
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!activity) return;

    setError('');
    setLoading(true);

    try {
      const completionDateTime = new Date(completionDate);

      // Validate completion date is in the past
      if (completionDateTime >= new Date()) {
        setError('Completion date must be in the past');
        setLoading(false);
        return;
      }

      await api.post(`/activities/${activity.id}/complete`, {
        completionDate: completionDateTime.toISOString(),
        completionOutcome,
      });

      enqueueSnackbar('Activity completed successfully!', { variant: 'success' });
      onSuccess();
      handleClose();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to complete activity';
      setError(errorMessage);
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError('');
    setCompletionOutcome('COMPLETED_OK');
    setCompletionDate(new Date().toISOString().slice(0, 16));
    onClose();
  };

  if (!activity) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Complete Activity</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            <strong>{activity.title || activity.activityType.replace(/_/g, ' ')}</strong>
          </Typography>

          {activity.scheduledAt && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Was scheduled for: {new Date(activity.scheduledAt).toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Typography>
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
            select
            id="completionOutcome"
            label="Completion Outcome"
            value={completionOutcome}
            onChange={(e) => setCompletionOutcome(e.target.value)}
            disabled={loading}
          >
            {completionOutcomes.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            margin="normal"
            required
            fullWidth
            id="completionDate"
            label="Completion Date & Time"
            type="datetime-local"
            value={completionDate}
            onChange={(e) => setCompletionDate(e.target.value)}
            disabled={loading}
            InputLabelProps={{
              shrink: true,
            }}
            helperText="Must be in the past"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? 'Completing...' : 'Complete Activity'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
