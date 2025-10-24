import React from 'react';
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
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/test/info');
    xhr.onload = () => {
      if (xhr.status === 200) {
        const info = JSON.parse(xhr.responseText);
        this.setState({ version: info.__v });
      }
    };
    xhr.send();
  }

  render() {
    const { context } = this.props;
    const { version } = this.state;

    return (
      <AppBar className="topbar-appBar" position="absolute">
        <Toolbar>
          <Typography variant="h5" color="inherit" style={{ flexGrow: 1 }}>
            Jay Lingappa 
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