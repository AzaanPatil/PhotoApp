import React from 'react';
import axios from 'axios';
import {
  AppBar, Toolbar, Typography, Button
} from '@mui/material';
import './TopBar.css';

/**
 * Define TopBar, a React component of project #5
 */
class TopBar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      version: ''
    };
  }

  componentDidMount() {
    // Fetch version info from the server
    // This will fail if not logged in, which is expected
    if (this.props.isLoggedIn) {
      axios.get('/test/info')
        .then(response => {
          this.setState({ version: response.data.__v });
        })
        .catch(error => {
          console.error('Error fetching version:', error);
        });
    }
  }

  handleLogout = () => {
    if (this.props.onLogout) {
      this.props.onLogout();
    }
  };

  render() {
    const { context, isLoggedIn, firstName, lastName } = this.props;
    const { version } = this.state;

    return (
      <AppBar className="topbar-appBar" position="absolute">
        <Toolbar>
          <Typography variant="h5" color="inherit" style={{ flexGrow: 1 }}>
            The CJ Strouds
          </Typography>
          {version !== '' && (
            <Typography variant="body1" color="inherit" style={{ marginRight: '20px' }}>
              Version: {version}
            </Typography>
          )}
          <Typography variant="h5" color="inherit" style={{ marginRight: '20px' }}>
            {context}
          </Typography>
          {isLoggedIn && (
            <>
              <Typography variant="body1" color="inherit" style={{ marginRight: '20px' }}>
                {firstName} {lastName}
              </Typography>
              <Button
                color="inherit"
                onClick={this.handleLogout}
                style={{ marginLeft: '10px' }}
              >
                Logout
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>
    );
  }
}

export default TopBar;