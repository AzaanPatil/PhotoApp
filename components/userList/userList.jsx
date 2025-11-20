import React from 'react';
import axios from 'axios';
import { Divider, List, ListItem, ListItemText, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import './userList.css';

class UserList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      users: [],
    };
  }

  // Fetch the user list when the component mounts
  componentDidMount() {
    if (this.props.isLoggedIn) {
      this.fetchUsers();
    }
  }

  componentDidUpdate(prevProps) {
    // If login status changed, fetch users
    if (prevProps.isLoggedIn !== this.props.isLoggedIn && this.props.isLoggedIn) {
      this.fetchUsers();
    }
  }

  fetchUsers = () => {
    axios.get('/user/list')
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

  render() {
    const { users } = this.state;
    const { isLoggedIn } = this.props;

    return (
      <div>
        <Typography variant="h6">Users</Typography>
        {!isLoggedIn ? (
          <Typography variant="body2" style={{ color: '#999', marginTop: '10px' }}>
            Login to view users
          </Typography>
        ) : (
          <List component="nav">
            {users.map((user) => (
              <React.Fragment key={user._id}>
                <ListItem button component={Link} to={`/users/${user._id}`}>
                  <ListItemText primary={`${user.first_name} ${user.last_name}`} />
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        )}
      </div>
    );
  }
}

export default UserList;
