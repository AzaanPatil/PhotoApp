import React from 'react';
import { Divider, List, ListItem, ListItemText, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import './userList.css';

class UserList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      users: window.models.userListModel() || [],
    };
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

