import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  AppBar,
  Toolbar,
  Card,
  CardContent,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { Add as AddIcon, Logout as LogoutIcon, ViewList as ViewListIcon, CalendarMonth as CalendarIcon } from '@mui/icons-material';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { useSnackbar } from 'notistack';
import api from '../services/api';
import AddActivityDialog from '../components/AddActivityDialog';
import EditActivityDialog from '../components/EditActivityDialog';
import CompleteActivityDialog from '../components/CompleteActivityDialog';

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

interface Stats {
  total: number;
  open: number;
  completed: number;
}

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const DnDCalendar = withDragAndDrop(Calendar);

export default function Dashboard() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, open: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [showDeleted, setShowDeleted] = useState(false);

  useEffect(() => {
    // Get user from localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [showDeleted]);

  const fetchActivities = async () => {
    try {
      const params = showDeleted ? '?includeDeleted=true' : '';
      const response = await api.get(`/activities${params}`);
      setActivities(response.data.activities);
      setStats(response.data.stats);
    } catch (err: any) {
      if (err.response?.status === 401) {
        // Token expired or invalid, redirect to login
        handleLogout();
      } else {
        setError('Failed to load activities');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      enqueueSnackbar('You have been logged out', { variant: 'info' });
      navigate('/login');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };


  // Convert activities to calendar events
  const calendarEvents = activities
    .filter(a => showDeleted || !a.deletedAt)
    .map(activity => {
      const date = activity.scheduledAt || activity.recordedAt;
      if (!date) return null;
      
      return {
        id: activity.id,
        title: activity.title || activity.activityType,
        start: new Date(date),
        end: new Date(date),
        resource: activity,
      };
    })
    .filter(Boolean) as any[];

  const handleViewChange = (_: React.MouseEvent<HTMLElement>, newView: 'list' | 'calendar' | null) => {
    if (newView !== null) {
      setView(newView);
    }
  };

  const handleEventDrop = async ({ event, start }: any) => {
    try {
      const activity = event.resource;
      
      // Only allow rescheduling of scheduled activities (not completed ones)
      if (activity.recordedAt) {
        setError('Cannot reschedule completed activities');
        setTimeout(() => setError(''), 3000);
        return;
      }

      await api.patch(`/activities/${activity.id}`, {
        scheduledAt: start.toISOString(),
      });

      // Refresh activities
      fetchActivities();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to reschedule activity';
      setError(errorMessage);
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleActivityClick = (activity: Activity) => {
    setSelectedActivity(activity);
    setEditDialogOpen(true);
  };

  const handleEventSelect = (event: any) => {
    handleActivityClick(event.resource);
  };

  const handleCompleteClick = (activity: Activity) => {
    setEditDialogOpen(false);
    setSelectedActivity(activity);
    setCompleteDialogOpen(true);
  };

  const handleCompleteSuccess = () => {
    fetchActivities();
    setCompleteDialogOpen(false);
    setSelectedActivity(null);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Schedula
          </Typography>
          {user && (
            <Typography variant="body1" sx={{ mr: 2 }}>
              {user.firstName} {user.lastName}
            </Typography>
          )}
          <Button color="inherit" onClick={handleLogout} startIcon={<LogoutIcon />}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Activities
                </Typography>
                <Typography variant="h3">{stats.total}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Scheduled
                </Typography>
                <Typography variant="h3" color="primary">
                  {stats.open}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Completed
                </Typography>
                <Typography variant="h3" color="success.main">
                  {stats.completed}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* View Toggle and Action Button */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ToggleButtonGroup
              value={view}
              exclusive
              onChange={handleViewChange}
              aria-label="view mode"
            >
              <ToggleButton value="list" aria-label="list view">
                <ViewListIcon sx={{ mr: 1 }} />
                List
              </ToggleButton>
              <ToggleButton value="calendar" aria-label="calendar view">
                <CalendarIcon sx={{ mr: 1 }} />
                Calendar
              </ToggleButton>
            </ToggleButtonGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={showDeleted}
                  onChange={(e) => setShowDeleted(e.target.checked)}
                  color="primary"
                />
              }
              label="Show deleted/cancelled"
            />
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            Add Activity
          </Button>
        </Box>

        {view === 'list' ? (
          <Box>
            {activities.filter(a => showDeleted || !a.deletedAt).length === 0 ? (
              <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                No activities yet. Click "Add Activity" to get started.
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {activities
                  .filter(a => showDeleted || !a.deletedAt)
                  .sort((a, b) => {
                    const dateA = new Date(a.scheduledAt || a.recordedAt || 0).getTime();
                    const dateB = new Date(b.scheduledAt || b.recordedAt || 0).getTime();
                    return dateB - dateA;
                  })
                  .map((activity) => {
                    const isScheduled = activity.scheduledAt && !activity.recordedAt;
                    const isPast = activity.recordedAt;
                    const isDeleted = !!activity.deletedAt;
                    const date = activity.scheduledAt || activity.recordedAt;
                    
                    return (
                      <Card 
                        key={activity.id}
                        sx={{
                          borderLeft: 4,
                          borderColor: isDeleted ? 'grey.500' : (isScheduled ? 'primary.main' : 'success.main'),
                          opacity: isDeleted ? 0.6 : 1,
                          '&:hover': { boxShadow: 4 },
                          transition: 'box-shadow 0.3s',
                          cursor: 'pointer',
                        }}
                        onDoubleClick={() => handleActivityClick(activity)}
                      >
                        <CardContent>
                          <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} md={6}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <Typography variant="h6" component="div" sx={{ textDecoration: isDeleted ? 'line-through' : 'none' }}>
                                  {activity.title || activity.activityType.replace(/_/g, ' ')}
                                </Typography>
                                {isDeleted && (
                                  <Chip label="Deleted" size="small" color="default" />
                                )}
                                {!isDeleted && isScheduled && (
                                  <Chip label="Scheduled" size="small" color="primary" />
                                )}
                                {!isDeleted && isPast && (
                                  <Chip label="Completed" size="small" color="success" />
                                )}
                              </Box>
                              <Typography variant="body2" color="text.secondary">
                                {formatDate(date)}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, flexWrap: 'wrap' }}>
                                <Chip 
                                  label={activity.activityType.replace(/_/g, ' ')} 
                                  size="small" 
                                  variant="outlined"
                                />
                                {activity.completionOutcome && (
                                  <Chip
                                    label={activity.completionOutcome.replace(/_/g, ' ')}
                                    size="small"
                                    color={activity.completionOutcome === 'COMPLETED_OK' ? 'success' : 'default'}
                                  />
                                )}
                              </Box>
                            </Grid>
                            {activity.notes && (
                              <Grid item xs={12}>
                                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                  {activity.notes}
                                </Typography>
                              </Grid>
                            )}
                          </Grid>
                        </CardContent>
                      </Card>
                    );
                  })}
              </Box>
            )}
          </Box>
        ) : (
          <Box sx={{ height: 600, bgcolor: 'background.paper', p: 2, borderRadius: 1 }}>
            <DnDCalendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor={(event: any) => event.start}
              endAccessor={(event: any) => event.end}
              style={{ height: '100%' }}
              views={['month', 'week', 'day']}
              defaultView="month"
              onEventDrop={handleEventDrop}
              onSelectEvent={handleEventSelect}
              resizable={false}
              draggableAccessor={(event: any) => !event.resource.recordedAt}
            />
          </Box>
        )}
      </Container>

      <AddActivityDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={fetchActivities}
      />

      <EditActivityDialog
        open={editDialogOpen}
        activity={selectedActivity}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedActivity(null);
        }}
        onSuccess={fetchActivities}
        onCompleteClick={handleCompleteClick}
      />

      <CompleteActivityDialog
        open={completeDialogOpen}
        activity={selectedActivity}
        onClose={() => {
          setCompleteDialogOpen(false);
          setSelectedActivity(null);
        }}
        onSuccess={handleCompleteSuccess}
      />
    </>
  );
}
