import React from 'react';
import axios from 'axios';
import {
  Typography,
  Card,
  CardContent,
  Modal,
  Box,
  IconButton,
  Grid
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import './favorites.css';

const prettyDate = (parm) => new Date(parm).toLocaleString();

class Favorites extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      favorites: [],
      modalOpen: false,
      selectedPhoto: null,
      loading: true,
      error: null
    };
  }

  componentDidMount() {
    this.loadFavorites();
  }

  loadFavorites = () => {
    this.setState({ loading: true, error: null });
    axios.get('/favorites')
      .then(response => {
        this.setState({
          favorites: response.data,
          loading: false
        });
      })
      .catch(error => {
        console.error('Error loading favorites:', error);
        this.setState({
          error: 'Failed to load favorites',
          loading: false
        });
      });
  };

  handleThumbnailClick = (photo) => {
    this.setState({
      modalOpen: true,
      selectedPhoto: photo
    });
  };

  handleCloseModal = () => {
    this.setState({
      modalOpen: false,
      selectedPhoto: null
    });
  };

  handleRemoveFavorite = (photoId, event) => {
    // Prevent modal from opening when clicking the X
    event.stopPropagation();

    if (window.confirm('Remove this photo from favorites?')) {
      axios.delete(`/photos/${photoId}/favorite`)
        .then(() => {
          // Remove from local state
          this.setState(prevState => ({
            favorites: prevState.favorites.filter(photo => photo._id !== photoId)
          }));
        })
        .catch(error => {
          console.error('Error removing favorite:', error);
          alert('Failed to remove favorite. Please try again.');
        });
    }
  };

  render() {
    const { favorites, modalOpen, selectedPhoto, loading, error } = this.state;

    if (loading) {
      return (
        <Card>
          <CardContent>
            <Typography variant="h6">Loading favorites...</Typography>
          </CardContent>
        </Card>
      );
    }

    if (error) {
      return (
        <Card>
          <CardContent>
            <Typography variant="h6" color="error">{error}</Typography>
          </CardContent>
        </Card>
      );
    }

    return (
      <div>
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              My Favorites
            </Typography>

            {favorites.length === 0 ? (
              <Typography variant="body1" color="textSecondary">
                You haven't favorited any photos yet. Browse photos and click the favorite button to add them here!
              </Typography>
            ) : (
              <Grid container spacing={2}>
                {favorites.map((photo) => (
                  <Grid item xs={6} sm={4} md={3} key={photo._id}>
                    <div className="favorite-thumbnail-container">
                      <img
                        src={`/images/${photo.file_name}`}
                        alt="Favorite"
                        className="favorite-thumbnail"
                        onClick={() => this.handleThumbnailClick(photo)}
                      />
                      <IconButton
                        className="favorite-remove-btn"
                        onClick={(e) => this.handleRemoveFavorite(photo._id, e)}
                        size="small"
                        sx={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          backgroundColor: 'rgba(255, 255, 255, 0.8)',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          }
                        }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </div>
                  </Grid>
                ))}
              </Grid>
            )}
          </CardContent>
        </Card>

        {/* Modal for displaying larger image */}
        <Modal
          open={modalOpen}
          onClose={this.handleCloseModal}
          aria-labelledby="favorite-photo-modal"
          aria-describedby="favorite-photo-modal-description"
        >
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            maxWidth: '90vw',
            maxHeight: '90vh',
            bgcolor: 'background.paper',
            boxShadow: 24,
            p: 2,
            outline: 'none'
          }}>
            {selectedPhoto && (
              <div>
                <img
                  src={`/images/${selectedPhoto.file_name}`}
                  alt="Favorite photo"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '70vh',
                    display: 'block',
                    margin: '0 auto'
                  }}
                />
                <Typography
                  id="favorite-photo-modal-description"
                  variant="body2"
                  sx={{ mt: 2, textAlign: 'center' }}
                >
                  Uploaded by {selectedPhoto.owner.first_name} {selectedPhoto.owner.last_name} on {prettyDate(selectedPhoto.date_time)}
                </Typography>
              </div>
            )}
          </Box>
        </Modal>
      </div>
    );
  }
}

export default Favorites;