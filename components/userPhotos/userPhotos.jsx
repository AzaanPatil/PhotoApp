import React from 'react';
import {
  Typography
} from '@mui/material';
import './userPhotos.css';


/**
 * Define UserPhotos, a React component of project #5
 */
class UserPhotos extends React.Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    this.loadUserPhotos();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.match.params.userId !== this.props.match.params.userId) {
      this.loadUserPhotos();
    }
  }

  loadUserPhotos() {
    const userId = this.props.match.params.userId;
    const userData = window.Models.userModel(userId);
    
    // Update TopBar context with "Photos of [User Name]"
    if (userData && this.props.onContextChange) {
      this.props.onContextChange(`Photos of ${userData.first_name} ${userData.last_name}`);
    }
  }

  render() {
    return (
      <Typography variant="body1">
      This should be the UserPhotos view of the PhotoShare app. Since
      it is invoked from React Router the params from the route will be
      in property match. So this should show details of user:
      {this.props.match.params.userId}. You can fetch the model for the user from
      window.models.photoOfUserModel(userId):
        <Typography variant="caption">
          {JSON.stringify(window.models.photoOfUserModel(this.props.match.params.userId))}
        </Typography>
      </Typography>
    );
  }
}

export default UserPhotos;