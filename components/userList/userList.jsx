import React from 'react';
import axios from 'axios';
import { Divider, List, ListItem, ListItemText, Typography, Avatar, Box, Chip } from '@mui/material';
import { Link } from 'react-router-dom';
import './userList.css';

class UserList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      users: [],
      userActivities: [],
      currentUser: null,
      loading: false
    };
    this.pollInterval = null;
  }

  // Fetch the user list and activities when the component mounts
  componentDidMount() {
    if (this.props.isLoggedIn) {
      this.fetchUsers();
      this.fetchUserActivities();
      // Poll for updates every 60 seconds
      this.pollInterval = setInterval(this.fetchUserActivities, 60000);
    }
  }

  componentDidUpdate(prevProps) {
    // If login status changed, fetch users and activities
    if (prevProps.isLoggedIn !== this.props.isLoggedIn && this.props.isLoggedIn) {
      this.fetchUsers();
      this.fetchUserActivities();
      this.pollInterval = setInterval(this.fetchUserActivities, 60000);
    } else if (prevProps.isLoggedIn !== this.props.isLoggedIn && !this.props.isLoggedIn) {
      // Clear polling when logged out
      if (this.pollInterval) {
        clearInterval(this.pollInterval);
        this.pollInterval = null;
      }
    }
  }

  componentWillUnmount() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  fetchUsers = () => {
    axios.get('/user/listWithCounts')
      .then((response) => {
        this.setState({ users: response.data });
      })
      .catch((error) => {
        console.error("Error fetching user list:", error);
        if (error.response?.status === 401) {
          console.log("Session expired");
        }
      });
  };

  fetchUserActivities = () => {
    if (!this.props.isLoggedIn) return;
    
    this.setState({ loading: true });
    axios.get('/user-activities')
      .then((response) => {
        // Separate current user from other users
        const currentUserId = this.props.currentUserId;
        const currentUserActivity = response.data.find(item => item.user._id === currentUserId);
        const otherUsersActivities = response.data.filter(item => item.user._id !== currentUserId);
        
        this.setState({
          userActivities: otherUsersActivities,
          currentUser: currentUserActivity,
          loading: false
        });
      })
      .catch((error) => {
        console.error("Error fetching user activities:", error);
        this.setState({ loading: false });
        if (error.response?.status === 401) {
          console.log("Session expired");
        }
      });
  };

  getActivityDescription = (activity) => {
    if (!activity) return "No recent activity";

    switch (activity.activity_type) {
      case 'photo_upload':
        return "posted a photo";
      case 'comment_added':
        return "commented on a photo";
      case 'user_register':
        return "joined PhotoShare";
      case 'user_login':
        return "logged in";
      case 'user_logout':
        return "logged out";
      case 'photo_liked':
        return "liked a photo";
      default:
        return "was active";
    }
  };

  getActivityTime = (dateTime) => {
    if (!dateTime) return "";
    
    const now = new Date();
    const activityTime = new Date(dateTime);
    const diffMs = now - activityTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  renderActivityItem = (userActivity, isCurrentUser = false) => {
    const { user, activity } = userActivity;
    
    return (
      <React.Fragment key={user._id}>
        <ListItem 
          button={!isCurrentUser} 
          component={!isCurrentUser ? Link : 'div'} 
          to={!isCurrentUser ? `/users/${user._id}` : undefined}
          sx={{
            flexDirection: 'column',
            alignItems: 'flex-start',
            py: 1,
            ...(isCurrentUser && {
              backgroundColor: 'rgba(25, 118, 210, 0.08)',
              borderRadius: 1,
              mb: 1
            })
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mb: 0.5 }}>
            <Avatar 
              sx={{ width: 32, height: 32, mr: 1, fontSize: '0.875rem' }}
              src={activity?.photo ? `/images/${activity.photo.file_name}` : undefined}
            >
              {user.first_name[0]}{user.last_name[0]}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: isCurrentUser ? 'bold' : 'normal' }}>
                {isCurrentUser ? 'You' : `${user.first_name} ${user.last_name}`}
                {isCurrentUser && <Chip label="You" size="small" sx={{ ml: 1, height: 16 }} />}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {this.getActivityDescription(activity)} • {this.getActivityTime(activity?.date_time)}
              </Typography>
            </Box>
          </Box>
          
          {activity?.photo && (
            <Box sx={{ width: '100%', mt: 0.5 }}>
              <Link 
                to={`/photos/${user._id}?photoId=${activity.photo._id}`}
                onClick={(e) => e.stopPropagation()}
                style={{ textDecoration: 'none' }}
              >
                <img
                  src={`/images/${activity.photo.file_name}`}
                  alt="Activity thumbnail"
                  className="activity-thumbnail"
                />
              </Link>
            </Box>
          )}
        </ListItem>
        <Divider />
      </React.Fragment>
    );
  };

  render() {
    const { users, userActivities, currentUser } = this.state;
    const { isLoggedIn } = this.props;

    return (
      <div>
        <Typography variant="h6" sx={{ mb: 2 }}>Activity Feed</Typography>
        {!isLoggedIn ? (
          <Typography variant="body2" style={{ color: '#999', marginTop: '10px' }}>
            Login to view activities
          </Typography>
        ) : (
          <List component="nav" sx={{ width: '100%', p: 0 }}>
            {/* Current User Activity */}
            {currentUser && currentUser.activity ? (
              this.renderActivityItem(currentUser, true)
            ) : currentUser ? (
              <ListItem sx={{ backgroundColor: 'rgba(25, 118, 210, 0.08)', borderRadius: 1, mb: 1 }}>
                <ListItemText 
                  primary="You - No recent activity" 
                  primaryTypographyProps={{ variant: 'body2', sx: { fontWeight: 'bold' } }}
                />
              </ListItem>
            ) : null}
            
            {/* Favorites Link */}
            <ListItem button component={Link} to="/favorites">
              <ListItemText 
                primary="⭐ My Favorites" 
                primaryTypographyProps={{ variant: 'body2', sx: { fontWeight: 'bold' } }}
              />
            </ListItem>
            <Divider />
            
            {/* Other Users Activities */}
            <Typography variant="subtitle2" sx={{ px: 2, py: 1, color: 'text.secondary' }}>
              Friends Activity
            </Typography>
            {userActivities.length === 0 ? (
              <ListItem>
                <ListItemText 
                  primary="No recent activity" 
                  primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }} 
                />
              </ListItem>
            ) : (
              userActivities.map(userActivity => this.renderActivityItem(userActivity))
            )}
            
            {/* Show loading state */}
            {this.state.loading && (
              <ListItem>
                <ListItemText primary="Updating..." primaryTypographyProps={{ variant: 'caption' }} />
              </ListItem>
            )}
          </List>
        )}
        {/* All users with counts */}
        {isLoggedIn && users && users.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Typography variant="subtitle2" sx={{ px: 2, py: 1, color: 'text.secondary' }}>
              All Users
            </Typography>
            <List component="nav" sx={{ width: '100%', p: 0 }}>
              {users.map(u => (
                <ListItem key={u._id} button component={Link} to={`/users/${u._id}`} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ width: 32, height: 32, mr: 1 }}>{u.first_name[0]}{u.last_name[0]}</Avatar>
                    <ListItemText primary={`${u.first_name} ${u.last_name}`} primaryTypographyProps={{ variant: 'body2' }} />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Chip label={u.photoCount} size="small" sx={{ bgcolor: 'green', color: '#fff', height: 22 }} title="Number of photos" />
                    <Chip 
                      label={u.commentCount} 
                      size="small" 
                      sx={{ bgcolor: 'crimson', color: '#fff', height: 22, cursor: 'pointer' }} 
                      component={Link}
                      to={`/users/${u._id}/comments`}
                      title="Comments authored by user"
                    />
                  </Box>
                </ListItem>
              ))}
            </List>
          </div>
        )}
      </div>
    );
  }
}

export default UserList;
