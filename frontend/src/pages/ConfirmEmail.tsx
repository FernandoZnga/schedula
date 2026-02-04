import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Alert,
  Paper,
  Button,
  CircularProgress,
} from '@mui/material';
import api from '../services/api';

export default function ConfirmEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const hasConfirmed = useRef(false);

  useEffect(() => {
    const confirmEmail = async () => {
      // Prevent duplicate calls in development (React.StrictMode)
      if (hasConfirmed.current) return;
      hasConfirmed.current = true;
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setMessage('Invalid confirmation link. No token provided.');
        return;
      }

      try {
        const response = await api.post('/auth/confirm-email', { token });
        setStatus('success');
        setMessage(response.data.message);

        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } catch (err: any) {
        setStatus('error');
        const errorMessage = err.response?.data?.error || 'Failed to confirm email. Please try again.';
        setMessage(errorMessage);
      }
    };

    confirmEmail();
  }, [searchParams, navigate]);

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            Schedula
          </Typography>
          <Typography component="h2" variant="h6" align="center" gutterBottom>
            Email Confirmation
          </Typography>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            {status === 'loading' && (
              <>
                <CircularProgress sx={{ mb: 2 }} />
                <Typography>Confirming your email...</Typography>
              </>
            )}

            {status === 'success' && (
              <>
                <Alert severity="success" sx={{ mb: 2 }}>
                  {message}
                </Alert>
                <Typography variant="body2" color="text.secondary">
                  Redirecting to login page...
                </Typography>
              </>
            )}

            {status === 'error' && (
              <>
                <Alert severity="error" sx={{ mb: 3 }}>
                  {message}
                </Alert>
                <Button
                  component={Link}
                  to="/login"
                  variant="contained"
                  fullWidth
                >
                  Go to Login
                </Button>
              </>
            )}
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
