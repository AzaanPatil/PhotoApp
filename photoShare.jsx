import React from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import {
  HashRouter, Route, Switch
} from 'react-router-dom';
import {
  Grid, Typography, Paper
} from '@mui/material';
import './styles/main.css';

// import necessary components
import TopBar from './components/topBar/TopBar';
import UserDetail from './components/userDetail/userDetail';
import UserList from './components/userList/userList';
import UserPhotos from './components/userPhotos/userPhotos';
import LoginRegister from './components/loginRegister/LoginRegister';

class PhotoShare extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      context: '',
      isLoggedIn: false,
      userId: null,
      firstName: '',
      lastName: '',
      checkingAuth: true,
    };
  }

  componentDidMount() {
    // Check if user has an active session
    this.checkAuthStatus();
  }

  checkAuthStatus = async () => {
    try {
      const response = await axios.get('/admin/session');
      this.setState({
        isLoggedIn: true,
        userId: response.data.userId,
        firstName: response.data.first_name,
        lastName: response.data.last_name,
        checkingAuth: false,
      });
    } catch (error) {
      console.log('No active session');
      this.setState({
        isLoggedIn: false,
        userId: null,
        firstName: '',
        lastName: '',
        checkingAuth: false,
      });
    }
  };

  handleLoginSuccess = (userData) => {
    this.setState({
      isLoggedIn: true,
      userId: userData.userId,
      firstName: userData.first_name,
      lastName: userData.last_name,
    });
  };

  handleLogout = async () => {
    try {
      await axios.get('/admin/logout');
      this.setState({
        isLoggedIn: false,
        userId: null,
        firstName: '',
        lastName: '',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Callback function to update TopBar context
  handleContextChange = (newContext) => {
    this.setState({ context: newContext });
  };

  render() {
    const { isLoggedIn, checkingAuth, userId } = this.state;

    // Show loading state while checking authentication
    if (checkingAuth) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <Typography variant="h6">Loading...</Typography>
        </div>
      );
    }

    // If not logged in, show login page
    if (!isLoggedIn) {
      return (
        <LoginRegister onLoginSuccess={this.handleLoginSuccess} />
      );
    }

    // If logged in, show main app
    return (
      <HashRouter>
        <div>
          <Grid container spacing={8}>
            <Grid item xs={12}>
              <TopBar
                context={this.state.context}
                isLoggedIn={isLoggedIn}
                userId={userId}
                firstName={this.state.firstName}
                lastName={this.state.lastName}
                onLogout={this.handleLogout}
              />
            </Grid>
            <div className="main-topbar-buffer" />
            <Grid item sm={3}>
              <Paper className="main-grid-item">
                <UserList isLoggedIn={isLoggedIn} />
              </Paper>
            </Grid>
            <Grid item sm={9}>
              <Paper className="main-grid-item">
                <Switch>
                  <Route exact path="/"
                    render={() => (
                      <Typography variant="body1">
                        Welcome to your photosharing app! Select a user from the
                        left panel to view their photos.
                      </Typography>
                    )}
                  />
                  <Route path="/users/:userId"
                    render={props => <UserDetail {...props} onContextChange={this.handleContextChange} />}
                  />
                  <Route path="/photos/:userId"
                    render={props => <UserPhotos {...props} onContextChange={this.handleContextChange} />}
                  />
                  <Route path="/users" component={UserList} />
                </Switch>
              </Paper>
            </Grid>
          </Grid>
        </div>
      </HashRouter>
    );
  }
}


ReactDOM.render(
  <PhotoShare />,
  document.getElementById('photoshareapp'),
);