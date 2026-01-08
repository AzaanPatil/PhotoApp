import React from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
// Ensure cookies (express-session) are sent with requests so session persists across reloads
axios.defaults.withCredentials = true;
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
import Activities from './components/activities/Activities';
import Favorites from './components/favorites/Favorites';
import CommentsByUser from './components/commentsByUser/CommentsByUser';

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
    // Try to restore session from localStorage quickly so refresh feels seamless.
    const stored = window.localStorage.getItem('photoshare_user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        this.setState({
          isLoggedIn: true,
          userId: parsed.userId,
          firstName: parsed.first_name || parsed.firstName || '',
          lastName: parsed.last_name || parsed.lastName || '',
          checkingAuth: false,
        });
      } catch (e) {
        // If parse fails, remove invalid entry
        window.localStorage.removeItem('photoshare_user');
      }
    }

    // Validate session with server in background. If invalid, clear stored session.
    try {
      const response = await axios.get('/admin/session');
      this.setState({
        isLoggedIn: true,
        userId: response.data.userId,
        firstName: response.data.first_name,
        lastName: response.data.last_name,
        checkingAuth: false,
      });
      // Ensure localStorage is up-to-date with server
      window.localStorage.setItem('photoshare_user', JSON.stringify(response.data));
    } catch (error) {
      // Server has no active session, clear any stored client session
      window.localStorage.removeItem('photoshare_user');
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
    userId: userData.userId || userData._id,
    firstName: userData.first_name,
    lastName: userData.last_name,
  }, () => {
    // Persist login on the client so refresh keeps the UI logged-in
    try {
      window.localStorage.setItem('photoshare_user', JSON.stringify({
        userId: this.state.userId,
        first_name: this.state.firstName,
        last_name: this.state.lastName
      }));
    } catch (e) {
      // ignore storage errors
    }
    // After state updates, navigate to user detail
    window.location.hash = `#/users/${userData.userId}`;
  });
};


  handleLogout = async () => {
  try {
    await axios.post('/admin/logout');
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
                <UserList isLoggedIn={isLoggedIn} currentUserId={userId} />
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
                    render={props => <UserDetail {...props} currentUserId={userId} onContextChange={this.handleContextChange} />}
                  />
                  <Route path="/users/:userId/comments"
                    render={props => <CommentsByUser {...props} />}
                  />
                  <Route path="/photos/:userId"
                    render={props => <UserPhotos {...props} currentUserId={userId} onContextChange={this.handleContextChange} />}
                  />
                  <Route path="/favorites" component={Favorites} />
                  <Route path="/activities" component={Activities} />
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