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
    axios.get('/user/list')
      .then((response) => {
        this.setState({ users: response.data });
      })
      .catch((error) => { // Handle error appropriately
        console.error("Error fetching user list:", error);
      });
  }

  render() {
    const { users } = this.state;

    return (
      <div>
        <Typography variant="h6">Users</Typography>
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
      </div>
    );
  }
}

export default UserList;
