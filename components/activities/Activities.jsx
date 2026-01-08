import React from 'react';
import axios from 'axios';
import {
  Typography, Card, CardContent, CardMedia, Box, Button,
  CircularProgress, Alert, Divider
} from '@mui/material';
import './Activities.css';

/**
 * Activities component displays the 5 most recent activities on the site
 * Shows photo uploads, comments, user registrations, logins, and logouts
 * Each activity includes timestamp, user name, and activity-specific details
 */
class Activities extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      activities: [],
      loading: true,
      error: null
    };
  }

  componentDidMount() {
    this.loadActivities();
  }

  loadActivities = () => {
    this.setState({ loading: true, error: null });
    axios.get('/activities')
      .then(response => {
        this.setState({
          activities: response.data,
          loading: false
        });
      })
      .catch(error => {
        console.error('Error loading activities:', error);
        this.setState({
          error: 'Failed to load activities',
          loading: false
        });
      });
  };

  getActivityTypeLabel = (activityType) => {
    const labels = {
      'photo_upload': 'Photo Upload',
      'comment_added': 'Comment Added',
      'user_register': 'User Registration',
      'user_login': 'User Login',
      'user_logout': 'User Logout'
    };
    return labels[activityType] || activityType;
  };

  formatDateTime = (dateTime) => {
    return new Date(dateTime).toLocaleString();
  };

  renderActivityContent = (activity) => {
    switch (activity.activity_type) {
      case 'photo_upload':
        return activity.photo ? (
          <Box display="flex" alignItems="center" mt={1}>
            <CardMedia
              component="img"
              image={`/images/${activity.photo.file_name}`}
              alt="Uploaded photo"
              sx={{
                width: 60,
                height: 60,
                objectFit: 'cover',
                borderRadius: 1,
                mr: 2
              }}
            />
            <Typography variant="body2" color="text.secondary">
              New photo uploaded
            </Typography>
          </Box>
        ) : null;

      case 'comment_added':
        return activity.photo ? (
          <Box display="flex" alignItems="center" mt={1}>
            <CardMedia
              component="img"
              image={`/images/${activity.photo.file_name}`}
              alt="Photo with comment"
              sx={{
                width: 60,
                height: 60,
                objectFit: 'cover',
                borderRadius: 1,
                mr: 2
              }}
            />
            <Box>
              <Typography variant="body2" color="text.secondary">
                Commented on photo
              </Typography>
              {activity.comment_text && (
                <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                  "{activity.comment_text.length > 50
                    ? `${activity.comment_text.substring(0, 50)}...`
                    : activity.comment_text}"
                </Typography>
              )}
            </Box>
          </Box>
        ) : null;

      default:
        return null;
    }
  };

  render() {
    const { activities, loading, error } = this.state;

    if (loading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Box p={3}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Button variant="outlined" onClick={this.loadActivities}>
            Try Again
          </Button>
        </Box>
      );
    }

    return (
      <Box p={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            Recent Activities
          </Typography>
          <Button variant="outlined" onClick={this.loadActivities}>
            Refresh
          </Button>
        </Box>

        {activities.length === 0 ? (
          <Typography variant="body1" color="text.secondary">
            No activities found.
          </Typography>
        ) : (
          <Box>
            {activities.map((activity, index) => (
              <Card key={activity._id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box flex={1}>
                      <Typography variant="h6" component="h2" gutterBottom>
                        {this.getActivityTypeLabel(activity.activity_type)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {this.formatDateTime(activity.date_time)}
                      </Typography>
                      <Typography variant="body1">
                        by {activity.user.first_name} {activity.user.last_name}
                      </Typography>
                      {this.renderActivityContent(activity)}
                    </Box>
                  </Box>
                </CardContent>
                {index < activities.length - 1 && <Divider />}
              </Card>
            ))}
          </Box>
        )}
      </Box>
    );
  }
}

export default Activities;