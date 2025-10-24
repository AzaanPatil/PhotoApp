import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Box,
} from "@mui/material"; //Styled using Material-UI components
import { Link } from "react-router-dom"; //for navigation links
import FetchModel from "../../lib/fetchModelData"; //utility to fetch model data
import "./userDetail.css"; //component-specific styles

//Displays details for a specific user
class UserDetail extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      user: null,
      loading: true,
      error: null,
    };
  }

  // Fetch user data when component mounts
  componentDidMount() {
    this.loadUser();
  }

  // Refetch user data if route parameter changes
  componentDidUpdate(prevProps) {
    // If route parameter changes, refetch user data
    if (prevProps.match.params.userId !== this.props.match.params.userId) {
      this.loadUser();
    }
  }

  // Fetch user data from API
  loadUser() {
    const userId = this.props.match.params.userId;

    this.setState({ loading: true, error: null });

    // Data is fetched with FetchModel from /user/:id
    FetchModel(`/user/${userId}`)
      .then((response) => { // Successful fetch
        this.setState({
          user: response.data,
          loading: false,
        });
      })
      .catch((err) => { // Handle fetch errors
        this.setState({
          error: `Error ${err.status}: ${err.statusText}`,
          loading: false,
        });
      });
  }

  // Render user detail view
  render() {
    const { user, loading, error } = this.state;

    // Show loading indicator
    if (loading) {
      return (
        <Box className="User-Card-Loading">
          <CircularProgress />
          <Typography variant="body2">Loading user details...</Typography>
        </Box>
      );
    }

    // Show error message if fetch failed
    if (error) {
      return (
        <Typography color="error" className="User-Card-Error">
          {error}
        </Typography>
      );
    }

    // Show message if no user data is available
    if (!user) {
      return (
        <Typography color="textSecondary">
          No user data available.
        </Typography>
      );
    }

    // Displays required user fields
    return (
      <Card className="User-Card">
        <CardContent>
          <Typography variant="h4" gutterBottom>
            {user.first_name} {user.last_name}
          </Typography>

          <Typography variant="body1" color="textSecondary">
            <strong>Occupation:</strong> {user.occupation}
          </Typography>

          <Typography variant="body1" color="textSecondary">
            <strong>Location:</strong> {user.location}
          </Typography>

          <Typography variant="body1" sx={{ marginTop: 2 }}>
            <strong>Description:</strong> {user.description}
          </Typography>

          <Box sx={{ marginTop: 3 }}>
            <Button //Link to navigate to user's photos
              variant="contained"
              component={Link}
              to={`/photos/${user._id}`}
              color="primary"
            >
              View {user.first_name}'s Photos
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }
}

export default UserDetail;
