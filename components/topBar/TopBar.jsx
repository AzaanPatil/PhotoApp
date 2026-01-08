import React from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, FormControl, InputLabel, Select, MenuItem, Chip,
  Box, Alert
} from '@mui/material';
import './TopBar.css';

/**
 * Define TopBar, a React component of project #5
 * Updated to include photo sharing functionality
 * 
 * PHOTO SHARING UI:
 * - Public: Photo visible to all users (default)
 * - Private: Photo visible only to owner
 * - Shared: Photo visible to owner + selected users
 * 
 * The upload dialog allows users to choose sharing options before uploading
 */
class TopBar extends React.Component {
  constructor(props) {
    super(props);
    this.fileInput = React.createRef();
    this.state = {
      uploadDialogOpen: false,        // Controls upload dialog visibility
      selectedFile: null,             // Currently selected file for upload
      sharingOption: 'public',        // 'public', 'private', or 'shared'
      selectedUsers: [],              // Array of user IDs for sharing
      availableUsers: [],             // All available users for sharing selection
      loadingUsers: false,            // Loading state for user list
      uploadError: null,              // Error message during upload
      uploading: false                // Upload in progress state
    };
  }

  handleAddPhotoClick = () => {
    if (this.fileInput && this.fileInput.current) {
      this.fileInput.current.click();
    }
  };

  handleFileChange = (evt) => {
    const file = evt.target.files && evt.target.files[0];
    if (!file) return;

    this.setState({
      selectedFile: file,
      uploadDialogOpen: true,
      uploadError: null
    });

    // Load available users for sharing
    this.loadAvailableUsers();
  };

  loadAvailableUsers = async () => {
    this.setState({ loadingUsers: true });
    try {
      const response = await axios.get('/user/list');
      this.setState({
        availableUsers: response.data,
        loadingUsers: false
      });
    } catch (error) {
      console.error('Error loading users:', error);
      this.setState({
        loadingUsers: false,
        uploadError: 'Failed to load user list'
      });
    }
  };

  handleSharingOptionChange = (event) => {
    this.setState({
      sharingOption: event.target.value,
      selectedUsers: event.target.value === 'shared' ? this.state.selectedUsers : []
    });
  };

  handleUserSelect = (userId) => {
    this.setState(prevState => {
      const isSelected = prevState.selectedUsers.includes(userId);
      if (isSelected) {
        return {
          selectedUsers: prevState.selectedUsers.filter(id => id !== userId)
        };
      } else {
        return {
          selectedUsers: [...prevState.selectedUsers, userId]
        };
      }
    });
  };

  handleUpload = async () => {
    const { selectedFile, sharingOption, selectedUsers } = this.state;

    if (!selectedFile) return;

    this.setState({ uploading: true, uploadError: null });

    try {
      const form = new FormData();
      form.append('uploadedphoto', selectedFile, selectedFile.name);

      // PHOTO SHARING LOGIC:
      // - 'public' sharingOption: don't send sharing_list (null = public)
      // - 'private' sharingOption: send empty array ([] = owner only)
      // - 'shared' sharingOption: send array of selected user IDs
      let sharingList = null;
      if (sharingOption === 'private') {
        sharingList = []; // Empty array means only owner can view
      } else if (sharingOption === 'shared' && selectedUsers.length > 0) {
        sharingList = selectedUsers; // Array of user IDs
      }
      // If sharingOption is 'public', sharingList remains null (public)

      if (sharingList !== null) {
        form.append('sharing_list', JSON.stringify(sharingList));
      }

      await axios.post('/photos/new', form);

      // Close dialog and reset state on successful upload
      this.setState({
        uploadDialogOpen: false,
        selectedFile: null,
        sharingOption: 'public',
        selectedUsers: [],
        uploading: false
      });

      // Reset file input
      if (this.fileInput && this.fileInput.current) {
        this.fileInput.current.value = '';
      }

      // Notify parent component that photo was added
      if (this.props.onPhotoAdded) {
        this.props.onPhotoAdded();
      }

    } catch (error) {
      console.error('Photo upload failed', error);
      this.setState({
        uploading: false,
        uploadError: error.response?.data?.error || 'Upload failed'
      });

      if (this.props.onUploadError) {
        this.props.onUploadError(error);
      }
    }
  };

  handleDialogClose = () => {
    if (!this.state.uploading) {
      this.setState({
        uploadDialogOpen: false,
        selectedFile: null,
        sharingOption: 'public',
        selectedUsers: [],
        uploadError: null
      });

      // Reset file input
      if (this.fileInput && this.fileInput.current) {
        this.fileInput.current.value = '';
      }
    }
  };

  render() {
    const { context, isLoggedIn, firstName } = this.props;
    const {
      uploadDialogOpen,
      selectedFile,
      sharingOption,
      selectedUsers,
      availableUsers,
      loadingUsers,
      uploadError,
      uploading
    } = this.state;

    return (
      <>
        <AppBar className="topbar-appBar" position="absolute">
          <Toolbar>
            <Typography variant="h5" color="inherit" style={{ flexGrow: 1 }}>
              The CJ Strouds
            </Typography>

      <Typography variant="h5" color="inherit" style={{ marginRight: '20px' }}>
        {context}
      </Typography>

            {!isLoggedIn && (
              <Typography variant="body1" color="inherit">
                Please login
              </Typography>
            )}

            {isLoggedIn && (
              <>
                <Typography variant="body1" color="inherit" style={{ marginRight: '20px' }}>
                  Hi {firstName}
                </Typography>
                <Button color="inherit" onClick={this.handleAddPhotoClick}>
                  Add Photo
                </Button>
                <Button color="inherit" component={Link} to="/activities">
                  Activities
                </Button>
                <input
                  ref={this.fileInput}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={this.handleFileChange}
                />
                <Button color="inherit" onClick={this.handleLogout}>
                  Log Out
                </Button>
              </>
            )}
          </Toolbar>
        </AppBar>

        {/* Photo Upload Dialog with Sharing Options */}
        <Dialog
          open={uploadDialogOpen}
          onClose={this.handleDialogClose}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Upload Photo</DialogTitle>
          <DialogContent>
            {selectedFile && (
              <Typography variant="body2" gutterBottom>
                Selected: {selectedFile.name}
              </Typography>
            )}

            {uploadError && (
              <Alert severity="error" style={{ marginBottom: 16 }}>
                {uploadError}
              </Alert>
            )}

            <FormControl fullWidth style={{ marginBottom: 16 }}>
              <InputLabel>Sharing Options</InputLabel>
              <Select
                value={sharingOption}
                onChange={this.handleSharingOptionChange}
                disabled={uploading}
              >
                <MenuItem value="public">Public - Everyone can view</MenuItem>
                <MenuItem value="private">Private - Only I can view</MenuItem>
                <MenuItem value="shared">Shared - Select specific users</MenuItem>
              </Select>
            </FormControl>

            {sharingOption === 'shared' && (
              <Box>
                <Typography variant="body2" gutterBottom>
                  Select users who can view this photo:
                </Typography>
                {loadingUsers ? (
                  <Typography variant="body2">Loading users...</Typography>
                ) : (
                  <Box display="flex" flexWrap="wrap" gap={1}>
                    {availableUsers.map(user => (
                      <Chip
                        key={user._id}
                        label={`${user.first_name} ${user.last_name}`}
                        onClick={() => this.handleUserSelect(user._id)}
                        color={selectedUsers.includes(user._id) ? "primary" : "default"}
                        variant={selectedUsers.includes(user._id) ? "filled" : "outlined"}
                        disabled={uploading}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={this.handleDialogClose} disabled={uploading}>
              Cancel
            </Button>
            <Button
              onClick={this.handleUpload}
              variant="contained"
              disabled={!selectedFile || uploading || (sharingOption === 'shared' && selectedUsers.length === 0)}
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }
}

export default TopBar;