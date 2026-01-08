import React from "react";
import axios from 'axios';
import {
  Button,
  Card,
  CardContent,
  Typography,
} from "@mui/material"; //Stylized using MUI components
import "./userDetail.css";
import {Link} from "react-router-dom";

/**
 * Displays details for a specific user
 */
class UserDetail extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      user: null,
      recentPhoto: null,
      mostCommentedPhoto: null,
      mentions: [],
      usageLoading: true,
      usageError: null,
      mentionsLoading: true,
      mentionsError: null
    };
    this.recentThumbRef = React.createRef();
    this.mostCommentedThumbRef = React.createRef();
  }

  // Load user data when component mounts or when userId changes
  componentDidMount() {
    this.loadUser();
    this.loadUsageInfo();
    this.loadMentions();
  }

  // Reload user data if the userId prop changes
  componentDidUpdate(prevProps) {
    if (prevProps.match.params.userId !== this.props.match.params.userId) {
      this.loadUser();
      this.loadUsageInfo();
      this.loadMentions();
    }
  }

  // Fetch user data based on userId from props
  loadUser() {
    const userId = this.props.match.params.userId;
    axios.get(`/user/${userId}`)
      .then(response => {
        const userData = response.data;
        this.setState({ user: userData });
        // Update TopBar context with user's name
        if (userData && this.props.onContextChange) {
          this.props.onContextChange(`${userData.first_name} ${userData.last_name}`);
        }
      })
      .catch(error => {
        console.error('Error fetching user:', error);
      });
  }

  loadUsageInfo() {
    const userId = this.props.match.params.userId;
    this.setState({ usageLoading: true, usageError: null });
    Promise.all([
      axios.get(`/user/${userId}/usage/recent-photo`),
      axios.get(`/user/${userId}/usage/most-commented`)
    ])
      .then(([recentRes, mostCommentedRes]) => {
        this.setState({
          recentPhoto: recentRes.data.photo,
          mostCommentedPhoto: mostCommentedRes.data.photo,
          usageLoading: false,
          usageError: null
        });
      })
      .catch(error => {
        this.setState({ usageLoading: false, usageError: 'Error loading usage info' });
        console.error('Error loading usage info:', error);
      });
  }

  loadMentions() {
    const userId = this.props.match.params.userId;
    this.setState({ mentionsLoading: true, mentionsError: null });
    axios.get(`/user/${userId}/mentions`)
      .then(response => {
        this.setState({
          mentions: response.data,
          mentionsLoading: false,
          mentionsError: null
        });
      })
      .catch(error => {
        this.setState({ mentionsLoading: false, mentionsError: 'Error loading mentions' });
        console.error('Error loading mentions:', error);
      });
  }

  // loadUsageInfo fetches both usage-related endpoints in parallel using
  // Promise.all. Both endpoints perform server-side computation so the
  // client simply renders the received metadata (thumbnail filename,
  // upload date, commentCount). We set loading/error state to provide
  // user feedback while requests are in-flight or if they fail.

  // Render user detail view
  handleThumbnailClick = (photoId) => {
    // Navigate to user photos view and scroll to the selected photo
    this.props.history.push({
      pathname: `/photos/${this.props.match.params.userId}`,
      state: { scrollToPhotoId: photoId }
    });
  };

  // Handle clicking on a mention thumbnail - navigate to the photo owner's page and scroll to photo
  handleMentionClick = (photoId, ownerId) => {
    this.props.history.push({
      pathname: `/photos/${ownerId}`,
      state: { scrollToPhotoId: photoId }
    });
  };

  // Handle account deletion
  handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone and will permanently remove all your photos, comments, and data.')) {
      axios.delete(`/user/${this.props.match.params.userId}`)
        .then(() => {
          // Redirect to login page after successful deletion
          window.location.href = '/';
        })
        .catch(error => {
          console.error('Error deleting account:', error);
          alert('Failed to delete account. Please try again.');
        });
    }
  };

  // Clicking a thumbnail navigates to the gallery route and passes the
  // chosen photo id in `location.state.scrollToPhotoId`. The gallery view
  // can read that state and call `scrollIntoView()` after rendering the
  // photo list to ensure the selected photo is visible.

  renderUsageInfo() {
    const { recentPhoto, mostCommentedPhoto, usageLoading, usageError } = this.state;
    if (usageLoading) {
      return <Typography className="usage-info" color="textSecondary">Loading usage info...</Typography>;
    }
    if (usageError) {
      return <Typography className="usage-info" color="error">{usageError}</Typography>;
    }
    if (!recentPhoto && !mostCommentedPhoto) {
      return <Typography className="usage-info" color="textSecondary">No photos available.</Typography>;
    }
    return (
      <div className="usage-info">
        <div className="usage-item">
          <div className="usage-title">Most Recently Uploaded Photo</div>
          {recentPhoto ? (
            <div className="thumbnail-container">
              {/* Thumbnail image — src uses the app's `/images/<file_name>`
                  convention. Clicking calls `handleThumbnailClick` which
                  navigates to the user's gallery and requests the gallery
                  scroll to the selected photo. */}
              <img
                src={recentPhoto.file_name ? `/images/${recentPhoto.file_name}` : ''}
                alt="Most Recent"
                className="thumbnail-image"
                onClick={() => this.handleThumbnailClick(recentPhoto._id)}
                ref={this.recentThumbRef}
              />
              {/* Display readable upload date pulled from the server-side
                  `date_time` field to ensure consistency with backend sorting. */}
              <div className="photo-date">Uploaded: {recentPhoto.date_time ? new Date(recentPhoto.date_time).toLocaleString() : ''}</div>
            </div>
          ) : (
            <Typography color="textSecondary">No recent photo available.</Typography>
          )}
        </div>
        <div className="usage-item">
          <div className="usage-title">Photo with the Most Comments</div>
          {mostCommentedPhoto ? (
            <div className="thumbnail-container">
              {/* Most-commented thumbnail — server returns `commentCount` to
                  avoid client-side counting. We display `0` if the value is
                  missing or the photo has no comments. */}
              <img
                src={mostCommentedPhoto.file_name ? `/images/${mostCommentedPhoto.file_name}` : ''}
                alt="Most Commented"
                className="thumbnail-image"
                onClick={() => this.handleThumbnailClick(mostCommentedPhoto._id)}
                ref={this.mostCommentedThumbRef}
              />
              <div className="comment-count">Comments: {typeof mostCommentedPhoto.commentCount === 'number' ? mostCommentedPhoto.commentCount : 0}</div>
            </div>
          ) : (
            <Typography color="textSecondary">No commented photo available.</Typography>
          )}
        </div>
      </div>
    );
  }

  renderMentions() {
    const { mentions, mentionsLoading, mentionsError } = this.state;
    if (mentionsLoading) {
      return <Typography className="mentions-info" color="textSecondary">Loading mentions...</Typography>;
    }
    if (mentionsError) {
      return <Typography className="mentions-info" color="error">{mentionsError}</Typography>;
    }
    if (!mentions || mentions.length === 0) {
      return <Typography className="mentions-info" color="textSecondary">No photos mention this user.</Typography>;
    }
    return (
      <div className="mentions-info">
        <div className="mentions-title">Photos That Mention {this.state.user?.first_name} {this.state.user?.last_name}</div>
        <div className="mentions-list">
          {mentions.map((photo) => (
            <div key={photo._id} className="mention-item">
              <div className="mention-thumbnail-container">
                <img
                  src={photo.file_name ? `/images/${photo.file_name}` : ''}
                  alt="Mentioned in photo"
                  className="mention-thumbnail-image"
                  onClick={() => this.handleMentionClick(photo._id, photo.owner._id)}
                />
                <div className="mention-owner">
                  <Link to={`/users/${photo.owner._id}`}>
                    {photo.owner.first_name} {photo.owner.last_name}
                  </Link>
                </div>
                <div className="mention-count">
                  Mentioned {photo.mentionCount} time{photo.mentionCount !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  render() {
    const { user } = this.state;
    if (!user) {
      return (
        <Typography color="textSecondary">
          No user data available.
        </Typography>
      );
    }
    return (
      <Card className="User-Card">
        <CardContent>
          <Typography variant="h5" gutterBottom>
            {user.first_name} {user.last_name}
          </Typography>
          <Typography variant="body1" color="textSecondary" gutterBottom>
            <strong>Location:</strong> {user.location}
          </Typography>
          <Typography variant="body1" color="textSecondary" gutterBottom>
            <strong>Occupation:</strong> {user.occupation}
          </Typography>
          <Typography variant="body1" gutterBottom>
            {user.description}
          </Typography>
          {this.renderUsageInfo()}
          {this.renderMentions()}
          <Button
            variant="contained"
            color="primary"
            component={Link}
            to={`/photos/${user._id}`}
            sx={{ mt: 2 }}
          >
            View {user.first_name} Photos
          </Button>
          {/* Delete account button - only show if current user is viewing their own profile */}
          {this.props.currentUserId === user._id && (
            <Button
              variant="contained"
              color="error"
              onClick={this.handleDeleteAccount}
              sx={{ mt: 2, ml: 2 }}
            >
              Delete Account
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }
}

export default UserDetail;
