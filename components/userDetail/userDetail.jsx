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
      user: null
    };
  }

  // Load user data when component mounts or when userId changes
  componentDidMount() {
    this.loadUser();
  }

  // Reload user data if the userId prop changes
  componentDidUpdate(prevProps) {
    if (prevProps.match.params.userId !== this.props.match.params.userId) {
      this.loadUser();
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

  // Render user detail view
  render() {
    const { user } = this.state;

    if (!user) {
      return (
        <Typography color="textSecondary">
          No user data available.
        </Typography>
      );
    }

    
    // Display user details using MUI Card component
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


          <Button
          variant = "contained"
          color = "primary"
          component = {Link}
          to = {`/photos/${user._id}`}
          sx= {{mt:2}}
          >
            View {user.first_name} Photos
          </Button>
        </CardContent>
      </Card>
    );
  }
}

export default UserDetail;
