import React from 'react';
import axios from 'axios';
import {
  Button, TextField, Paper, Typography, Box, Alert
} from '@mui/material';
import './LoginRegister.css';

/**
 * LoginRegister component for user authentication
 */
class LoginRegister extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      login_name: '',
      password: '',
      error: '',
      loading: false,
    };
  }

  handleInputChange = (e) => {
    const { name, value } = e.target;
    this.setState({ [name]: value });
  };

  handleLogin = async () => {
    const { login_name, password } = this.state;

    if (!login_name || !password) {
      this.setState({ error: 'Please enter both login name and password' });
      return;
    }

    this.setState({ loading: true, error: '' });

    try {
      const response = await axios.post('/admin/login', {
        login_name,
        password,
      });

      // Login successful - call the onLoginSuccess callback
      if (this.props.onLoginSuccess) {
        this.props.onLoginSuccess(response.data);
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMsg = error.response?.data?.error || 'Login failed. Please try again.';
      this.setState({ error: errorMsg });
    } finally {
      this.setState({ loading: false });
    }
  };

  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.handleLogin();
    }
  };

  render() {
    const {
      login_name, password, error, loading
    } = this.state;

    return (
      <Box className="login-container">
        <Paper className="login-paper" elevation={3}>
          <Typography variant="h4" className="login-title">
            Photo Share App
          </Typography>
          <Typography variant="body1" className="login-subtitle">
            Please login to continue
          </Typography>

          {error && (
            <Alert severity="error" className="login-error">
              {error}
            </Alert>
          )}

          <TextField
            label="Login Name"
            name="login_name"
            value={login_name}
            onChange={this.handleInputChange}
            onKeyPress={this.handleKeyPress}
            fullWidth
            margin="normal"
            variant="outlined"
            disabled={loading}
          />

          <TextField
            label="Password"
            name="password"
            type="password"
            value={password}
            onChange={this.handleInputChange}
            onKeyPress={this.handleKeyPress}
            fullWidth
            margin="normal"
            variant="outlined"
            disabled={loading}
          />

          <Button
            variant="contained"
            color="primary"
            onClick={this.handleLogin}
            fullWidth
            disabled={loading}
            className="login-button"
          >
            {loading ? 'Logging in...' : 'Login'}
          </Button>

          <Typography variant="body2" className="login-hint">
            Hint: Use last name (lowercase) as login name with password "weak"
          </Typography>
        </Paper>
      </Box>
    );
  }
}

export default LoginRegister;
