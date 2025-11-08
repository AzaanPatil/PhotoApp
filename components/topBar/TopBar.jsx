import React from 'react';
import axios from 'axios';
import {
  AppBar, Toolbar, Typography
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
    axios.get('/test/info')
      .then(response => {
        this.setState({ version: response.data.__v });
      })
      .catch(error => {
        console.error('Error fetching version:', error);
      });
  }

  render() {
    const { context } = this.props;
    const { version } = this.state;

    return (
      <AppBar className="topbar-appBar" position="absolute">
        <Toolbar>
          <Typography variant="h5" color="inherit" style={{ flexGrow: 1 }}>
            The CJ Strouds
          </Typography>
          {version !== ''&& (
            <Typography variant="body1" color="inherit" style={{ marginRight: '20px' }}>
              Version: {version}
            </Typography>
          )}
          <Typography variant="h5" color="inherit">
            {context}
          </Typography>
        </Toolbar>
      </AppBar>
    );
  }
}

export default TopBar;