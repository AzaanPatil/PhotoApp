import React from 'react';
import axios from 'axios';
import {
  Button, TextField, Paper, Typography, Box, Alert
} from '@mui/material';
import './LoginRegister.css';

class LoginRegister extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      // Login fields
      login_name: '',
      password: '',
      // Registration fields
      reg_login_name: '',
      reg_password: '',
      reg_password_repeat: '',
      first_name: '',
      last_name: '',
      location: '',
      description: '',
      occupation: '',
      // Messages
      error: '',
      success: '',
      loading: false,
    };
  }

  handleInputChange = (e) => {
    const { name, value } = e.target;
    this.setState({ [name]: value });
  };

  // LOGIN
  handleLogin = async () => {
    const { login_name, password } = this.state;
    if (!login_name || !password) {
      this.setState({ error: 'Please enter your login and password', success: '' });
      return;
    }

    this.setState({ loading: true, error: '', success: '' });

    try {
      const response = await axios.post('/admin/login', { login_name, password });
      if (this.props.onLoginSuccess) this.props.onLoginSuccess(response.data);
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Login failed. Please try again.';
      this.setState({ error: errorMsg });
    } finally {
      this.setState({ loading: false });
    }
  };

  // REGISTRATION
  handleRegister = async () => {
    const {
      reg_login_name,
      reg_password,
      reg_password_repeat,
      first_name,
      last_name,
      location,
      description,
      occupation
    } = this.state;

    // Basic validation
    if (!reg_login_name || !reg_password || !reg_password_repeat || !first_name || !last_name) {
      this.setState({ error: 'Please fill out all required fields', success: '' });
      return;
    }

    if (reg_password !== reg_password_repeat) {
      this.setState({ error: 'Passwords dont match', success: '' });
      return;
    }

    this.setState({ loading: true, error: '', success: '' });

    try {
      await axios.post('/user', {
        login_name: reg_login_name,
        password: reg_password,
        first_name,
        last_name,
        location,
        description,
        occupation
      });

      this.setState({
        success: 'Registration successful! You can now log in.',
        error: '',
        reg_login_name: '',
        reg_password: '',
        reg_password_repeat: '',
        first_name: '',
        last_name: '',
        location: '',
        description: '',
        occupation: ''
      });
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Registration failed. Please try again.';
      this.setState({ error: errorMsg, success: '' });
    } finally {
      this.setState({ loading: false });
    }
  };

  render() {
    const {
      login_name, password, error, success, loading,
      reg_login_name, reg_password, reg_password_repeat,
      first_name, last_name, location, description, occupation
    } = this.state;

    return (
      <Box className="login-container">
        <Paper className="login-paper" elevation={3}>
          <Typography variant="h4" className="login-title">
            Photo Share App
          </Typography>

          {error && <Alert severity="error" className="login-error">{error}</Alert>}
          {success && <Alert severity="success" className="login-success">{success}</Alert>}

          {/* LOGIN FORM */}
          <Typography variant="body1" className="login-subtitle">Login</Typography>
          <TextField
            label="Login Name"
            name="login_name"
            value={login_name}
            onChange={this.handleInputChange}
            fullWidth margin="normal" variant="outlined" disabled={loading}
          />
          <TextField
            label="Password"
            name="password"
            type="password"
            value={password}
            onChange={this.handleInputChange}
            fullWidth margin="normal" variant="outlined" disabled={loading}
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

          {/* REGISTRATION FORM */}
          <Typography variant="body1" className="login-subtitle" style={{ marginTop: '20px' }}>Register</Typography>
          <TextField
            label="Login Name"
            name="reg_login_name"
            value={reg_login_name}
            onChange={this.handleInputChange}
            fullWidth margin="normal" variant="outlined" disabled={loading}
          />
          <TextField
            label="Password"
            name="reg_password"
            type="password"
            value={reg_password}
            onChange={this.handleInputChange}
            fullWidth margin="normal" variant="outlined" disabled={loading}
          />
          <TextField
            label="Repeat Password"
            name="reg_password_repeat"
            type="password"
            value={reg_password_repeat}
            onChange={this.handleInputChange}
            fullWidth margin="normal" variant="outlined" disabled={loading}
          />
          <TextField
            label="First Name"
            name="first_name"
            value={first_name}
            onChange={this.handleInputChange}
            fullWidth margin="normal" variant="outlined" disabled={loading}
          />
          <TextField
            label="Last Name"
            name="last_name"
            value={last_name}
            onChange={this.handleInputChange}
            fullWidth margin="normal" variant="outlined" disabled={loading}
          />
          <TextField
            label="Location"
            name="location"
            value={location}
            onChange={this.handleInputChange}
            fullWidth margin="normal" variant="outlined" disabled={loading}
          />
          <TextField
            label="Description"
            name="description"
            value={description}
            onChange={this.handleInputChange}
            fullWidth margin="normal" variant="outlined" disabled={loading}
          />
          <TextField
            label="Occupation"
            name="occupation"
            value={occupation}
            onChange={this.handleInputChange}
            fullWidth margin="normal" variant="outlined" disabled={loading}
          />
          <Button
            variant="contained"
            color="secondary"
            onClick={this.handleRegister}
            fullWidth
            disabled={loading}
            className="register-button"
            style={{ marginTop: '10px' }}
          >
            {loading ? 'Registering...' : 'Register Me'}
          </Button>
        </Paper>
      </Box>
    );
  }
}

export default LoginRegister;
