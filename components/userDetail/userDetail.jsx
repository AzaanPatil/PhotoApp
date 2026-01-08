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
      usageLoading: true,
      usageError: null
    };
    this.recentThumbRef = React.createRef();
    this.mostCommentedThumbRef = React.createRef();
  }

  // Load user data when component mounts or when userId changes
  componentDidMount() {
    this.loadUser();
    this.loadUsageInfo();
  }

  // Reload user data if the userId prop changes
  componentDidUpdate(prevProps) {
    if (prevProps.match.params.userId !== this.props.match.params.userId) {
      this.loadUser();
      this.loadUsageInfo();
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
          <Button
            variant="contained"
            color="primary"
            component={Link}
            to={`/photos/${user._id}`}
            sx={{ mt: 2 }}
          >
            View {user.first_name} Photos
          </Button>
        </CardContent>
      </Card>
    );
  }
}

export default UserDetail;
