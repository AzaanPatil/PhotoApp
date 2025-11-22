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
    this.fileInput = React.createRef();
  }

  handleLogout = () => {
    if (this.props.onLogout) {
      this.props.onLogout();
    }
  };

  handleAddPhotoClick = () => {
    if (this.fileInput && this.fileInput.current) {
      this.fileInput.current.click();
    }
  };

  handleFileChange = (evt) => {
    const file = evt.target.files && evt.target.files[0];
    if (!file) return;

    const form = new FormData();
    form.append('uploadedphoto', file, file.name);

    axios.post('/photos/new', form)
      .then(() => {
        if (this.props.onPhotoAdded) this.props.onPhotoAdded();
      })
      .catch((err) => {
        console.error('Photo upload failed', err);
        if (this.props.onUploadError) this.props.onUploadError(err);
      })
      .finally(() => {
        // reset the input so same file can be re-selected later
        if (this.fileInput && this.fileInput.current) this.fileInput.current.value = '';
      });
  };

  render() {
   const { context, isLoggedIn, firstName } = this.props;

return (
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
);
  }
}

export default TopBar;