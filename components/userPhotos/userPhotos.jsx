import React from 'react';
import axios from 'axios';
import { 
  Typography, 
  Card, 
  CardContent, 
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Box
} from '@mui/material';
import { Link } from 'react-router-dom';
import './userPhotos.css';

const prettyDate = (parm) => new Date(parm).toLocaleString();

// Function to render comment text with highlighted @mentions
const renderCommentWithMentions = (commentText, mentions, users) => {
  if (!mentions || mentions.length === 0 || !users || users.length === 0) {
    return commentText;
  }

  // Create a map of user ID to user object for quick lookup
  const userMap = {};
  users.forEach(user => {
    userMap[user._id] = user;
  });

  // Replace @mentions with links
  let processedText = commentText;
  mentions.forEach(mentionId => {
    const user = userMap[mentionId];
    if (user) {
      const fullName = `${user.first_name} ${user.last_name}`;
      const firstNameOnly = user.first_name;
      
      // Try to match "First Last" first, then just "First"
      let mentionRegex = new RegExp(`@${fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      if (mentionRegex.test(processedText)) {
        const link = `<a href="/users/${user._id}" style="color: #1976d2; text-decoration: none; font-weight: bold;">@${fullName}</a>`;
        processedText = processedText.replace(mentionRegex, link);
      } else {
        // Try just first name
        mentionRegex = new RegExp(`@${firstNameOnly.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        if (mentionRegex.test(processedText)) {
          const link = `<a href="/users/${user._id}" style="color: #1976d2; text-decoration: none; font-weight: bold;">@${firstNameOnly}</a>`;
          processedText = processedText.replace(mentionRegex, link);
        }
      }
    }
  });

  return <span dangerouslySetInnerHTML={{ __html: processedText }} />;
};

function PhotoCard({ photo, onAddComment, isHighlighted, photoRef, currentUserId, onPhotoDelete, onCommentDelete, onLikeToggle, onFavoriteToggle, onTagUpdate }) {
  const [commentText, setCommentText] = React.useState('');
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState([]);
  const [users, setUsers] = React.useState([]);
  const [cursorPosition, setCursorPosition] = React.useState(0);
  const inputRef = React.useRef(null);

  // Tagging state
  const [isSelecting, setIsSelecting] = React.useState(false);
  const [selectionRect, setSelectionRect] = React.useState(null);
  const [selectedUserId, setSelectedUserId] = React.useState('');
  const [imageRect, setImageRect] = React.useState(null);
  const [hoveredTag, setHoveredTag] = React.useState(null);
  const imageRef = React.useRef(null);

  // Load users for autocomplete on mount
  React.useEffect(() => {
    axios.get('/user/list')
      .then(response => {
        setUsers(response.data);
      })
      .catch(error => {
        console.error('Error fetching users:', error);
      });
  }, []);

  // Set up image rectangle when image loads
  React.useEffect(() => {
    if (imageRef.current) {
      const updateImageRect = () => {
        const rect = imageRef.current.getBoundingClientRect();
        setImageRect({
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height
        });
      };
      updateImageRect();
      window.addEventListener('resize', updateImageRect);
      return () => window.removeEventListener('resize', updateImageRect);
    }
  }, [photo]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    const position = e.target.selectionStart;
    setCommentText(value);
    setCursorPosition(position);

    // Check if we're typing an @mention
    const textBeforeCursor = value.substring(0, position);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    
    if (atIndex !== -1 && atIndex === textBeforeCursor.length - 1) {
      // Just typed @, show all users
      setSuggestions(users);
      setShowSuggestions(true);
    } else if (atIndex !== -1) {
      // Typing after @, filter users
      const query = textBeforeCursor.substring(atIndex + 1).toLowerCase().trim();
      if (query.length > 0) {
        const filtered = users.filter(user => {
          const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
          const firstName = user.first_name.toLowerCase();
          const lastName = user.last_name.toLowerCase();
          const loginName = user.login_name.toLowerCase();
          
          return fullName.includes(query) || 
                 firstName.includes(query) || 
                 lastName.includes(query) ||
                 loginName.includes(query);
        });
        setSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
      } else {
        setSuggestions(users);
        setShowSuggestions(true);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (user) => {
    const textBeforeAt = commentText.substring(0, commentText.lastIndexOf('@'));
    const textAfterCursor = commentText.substring(cursorPosition);
    const mentionText = `${user.first_name} ${user.last_name}`;
    const newText = `${textBeforeAt}@${mentionText} ${textAfterCursor}`;
    setCommentText(newText);
    setShowSuggestions(false);
    inputRef.current.focus();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = commentText.trim();
    if (!trimmed) {
      return; // frontend guard; server also rejects empty
    }
    onAddComment(photo._id, trimmed);
    setCommentText('');
    setShowSuggestions(false);
  };

  // Tagging handlers
  const handleImageMouseDown = (e) => {
    if (!imageRect) return;
    e.preventDefault();
    const rect = imageRect;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setIsSelecting(true);
    setSelectionRect({
      startX: x,
      startY: y,
      endX: x,
      endY: y
    });
  };

  const handleImageMouseMove = (e) => {
    if (!isSelecting || !imageRect) return;
    const rect = imageRect;
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setSelectionRect(prev => ({
      ...prev,
      endX: x,
      endY: y
    }));
  };

  const handleImageMouseUp = () => {
    if (!isSelecting) return;
    setIsSelecting(false);
    const rect = selectionRect;
    const width = Math.abs(rect.endX - rect.startX);
    const height = Math.abs(rect.endY - rect.startY);
    if (width > 0.01 && height > 0.01) {
      // Valid selection
      setSelectionRect({
        x: Math.min(rect.startX, rect.endX),
        y: Math.min(rect.startY, rect.endY),
        width: width,
        height: height
      });
    } else {
      setSelectionRect(null);
    }
  };

  const handleTagSubmit = () => {
    if (!selectionRect || !selectedUserId) return;
    const tagData = {
      user_id: selectedUserId,
      x: selectionRect.x,
      y: selectionRect.y,
      width: selectionRect.width,
      height: selectionRect.height
    };
    axios.post(`/photos/${photo._id}/tags`, tagData)
      .then(response => {
        onTagUpdate(photo._id, response.data);
        setSelectionRect(null);
        setSelectedUserId('');
      })
      .catch(error => {
        console.error('Error creating tag:', error);
        alert('Failed to create tag');
      });
  };

  const handleTagDelete = (tagId) => {
    axios.delete(`/photos/${photo._id}/tags/${tagId}`)
      .then(() => {
        onTagUpdate(photo._id, photo.tags.filter(tag => tag._id !== tagId));
      })
      .catch(error => {
        console.error('Error deleting tag:', error);
        alert('Failed to delete tag');
      });
  };

  return (
    <Card 
      className={`photo-card ${isHighlighted ? 'highlighted' : ''}`}
      ref={photoRef}
      sx={{ mb: 2 }}
    >
      <div 
        style={{ 
          position: 'relative',
          display: 'inline-block',
          width: '100%'
        }}
        onMouseDown={handleImageMouseDown}
        onMouseMove={handleImageMouseMove}
        onMouseUp={handleImageMouseUp}
        onMouseLeave={handleImageMouseUp}
      >
        <img
          ref={imageRef}
          className="photo-img"
          src={`/images/${photo.file_name}`}
          alt="user upload"
          style={{ width: '100%', display: 'block', cursor: 'crosshair' }}
        />
        
        {/* Render selection rectangle */}
        {selectionRect && selectionRect.startX !== undefined && (
          <div
            style={{
              position: 'absolute',
              left: `${Math.min(selectionRect.startX, selectionRect.endX) * 100}%`,
              top: `${Math.min(selectionRect.startY, selectionRect.endY) * 100}%`,
              width: `${Math.abs(selectionRect.endX - selectionRect.startX) * 100}%`,
              height: `${Math.abs(selectionRect.endY - selectionRect.startY) * 100}%`,
              border: '2px solid #1976d2',
              backgroundColor: 'rgba(25, 118, 210, 0.1)',
              boxSizing: 'border-box'
            }}
          />
        )}

        {/* Render existing tags */}
        {photo.tags && photo.tags.map(tag => (
          <div
            key={tag._id}
            style={{
              position: 'absolute',
              left: `${tag.x * 100}%`,
              top: `${tag.y * 100}%`,
              width: `${tag.width * 100}%`,
              height: `${tag.height * 100}%`,
              border: '2px solid #4caf50',
              boxSizing: 'border-box',
              cursor: 'pointer'
            }}
            onMouseEnter={() => setHoveredTag(tag._id)}
            onMouseLeave={() => setHoveredTag(null)}
          >
            {hoveredTag === tag._id && (
              <div
                style={{
                  position: 'absolute',
                  top: '-30px',
                  left: '0',
                  backgroundColor: '#333',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                  zIndex: 1000
                }}
              >
                {tag.user.first_name} {tag.user.last_name}
                {tag.created_by === currentUserId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTagDelete(tag._id);
                    }}
                    style={{
                      marginLeft: '8px',
                      padding: '2px 6px',
                      backgroundColor: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      fontSize: '11px'
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <CardContent>
        <Typography variant="caption">
          Taken: {prettyDate(photo.date_time)}
        </Typography>
        
        {/* Sharing indicator - shows photo visibility status */}
        {photo.sharing_list !== undefined && (
          <Typography variant="caption" style={{ display: 'block', marginTop: 4 }}>
            {photo.sharing_list === null ? (
              <span style={{ color: '#4caf50' }}>🌐 Public</span>
            ) : photo.sharing_list.length === 0 ? (
              <span style={{ color: '#f44336' }}>🔒 Private</span>
            ) : (
              <span style={{ color: '#ff9800' }}>👥 Shared with {photo.sharing_list.length} user{photo.sharing_list.length !== 1 ? 's' : ''}</span>
            )}
            {/* Delete photo button - only show if current user owns the photo */}
            {currentUserId === photo.user_id && (
              <button 
                onClick={() => onPhotoDelete(photo._id)}
                style={{ 
                  marginLeft: 8, 
                  backgroundColor: '#f44336', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: 4, 
                  padding: '2px 6px', 
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Delete Photo
              </button>
            )}
          </Typography>
        )}
        
        {/* Like button and count */}
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            onClick={() => onLikeToggle(photo._id)}
            style={{ 
              backgroundColor: (photo.likes || []).includes(currentUserId) ? '#1976d2' : '#e0e0e0',
              color: (photo.likes || []).includes(currentUserId) ? 'white' : 'black',
              border: 'none', 
              borderRadius: 4, 
              padding: '4px 8px', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {(photo.likes || []).includes(currentUserId) ? '❤️' : '🤍'} 
            {(photo.likes || []).includes(currentUserId) ? 'Unlike' : 'Like'}
          </button>
          <Typography variant="body2" color="textSecondary">
            {(photo.likes || []).length} like{(photo.likes || []).length !== 1 ? 's' : ''}
          </Typography>
        </div>

        {/* Favorite button */}
        {currentUserId && (
          <div style={{ marginTop: 4 }}>
            <button 
              onClick={() => onFavoriteToggle(photo._id)}
              disabled={photo.isFavorited}
              style={{ 
                backgroundColor: photo.isFavorited ? '#ff9800' : '#e0e0e0',
                color: photo.isFavorited ? 'white' : 'black',
                border: 'none', 
                borderRadius: 4, 
                padding: '4px 8px', 
                cursor: photo.isFavorited ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                opacity: photo.isFavorited ? 0.7 : 1
              }}
            >
              {photo.isFavorited ? '⭐ Favorited' : '☆ Favorite'}
            </button>
          </div>
        )}
        
        <Divider sx={{ my: 1 }} />

        {/* Tagging interface */}
        {selectionRect && !selectionRect.startX && (
          <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
            <Typography variant="body2" style={{ marginBottom: 8 }}>
              Tag this person:
            </Typography>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                marginBottom: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                fontFamily: 'inherit'
              }}
            >
              <option value="">-- Select a user --</option>
              {users.map(user => (
                <option key={user._id} value={user._id}>
                  {user.first_name} {user.last_name}
                </option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleTagSubmit}
                disabled={!selectedUserId}
                style={{
                  flex: 1,
                  padding: '8px',
                  backgroundColor: selectedUserId ? '#4caf50' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: selectedUserId ? 'pointer' : 'not-allowed'
                }}
              >
                Create Tag
              </button>
              <button
                onClick={() => {
                  setSelectionRect(null);
                  setSelectedUserId('');
                }}
                style={{
                  flex: 1,
                  padding: '8px',
                  backgroundColor: '#999',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        
        {/* Existing comments */}
        <div className="comments">
          {(photo.comments || []).map((c) => (
            <div key={c._id} className="comment-row">
              <Typography variant="caption">{prettyDate(c.date_time)}</Typography>
              {' - '}
              <Link to={`/users/${c.user._id}`}>
                {c.user.first_name} {c.user.last_name}
              </Link>
              <Typography variant="body2">
                {renderCommentWithMentions(c.comment, c.mentions || [], users)}
              </Typography>
              {/* Delete comment button - only show if current user is the comment author */}
              {currentUserId === c.user._id && (
                <button 
                  onClick={() => onCommentDelete(c._id)}
                  style={{ 
                    marginLeft: 8, 
                    backgroundColor: '#f44336', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: 4, 
                    padding: '1px 4px', 
                    cursor: 'pointer',
                    fontSize: '10px'
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>

        {/* New comment input (with @mention autocomplete) */}
        <form onSubmit={handleSubmit} style={{ marginTop: 8, position: 'relative' }}>
          <input
            ref={inputRef}
            type="text"
            value={commentText}
            placeholder="Add a comment... (@mention users)"
            onChange={handleInputChange}
            style={{ width: '70%', marginRight: 8, padding: 4 }}
          />
          <button type="submit">Post</button>
          
          {/* Autocomplete suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="autocomplete-dropdown">
              {suggestions.slice(0, 5).map((user) => (
                <div
                  key={user._id}
                  className="autocomplete-item"
                  onClick={() => handleSuggestionClick(user)}
                >
                  {user.first_name} {user.last_name}
                </div>
              ))}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

class UserPhotos extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      photos: [],
      highlightedPhotoId: null,
      // index of currently viewed photo in single-photo viewer
      currentIndex: 0
    };
    this.photoRefs = {};
  }
  
  componentDidMount() {
    this.loadPhotos();
    this.checkForHighlightedPhoto();
    // Listen for history changes so browser back/forward updates viewer
    if (this.props.history && this.props.history.listen) {
      this.unlisten = this.props.history.listen((location, action) => {
        const params = new URLSearchParams(location.search);
        const photoId = params.get('photoId');
        if (photoId && this.state.photos && this.state.photos.length) {
          this.setCurrentIndexByPhotoId(photoId);
        }
      });
    }
  }

  componentWillUnmount() {
    if (this.unlisten) this.unlisten();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.match.params.userId !== this.props.match.params.userId) {
      this.loadPhotos();
      this.checkForHighlightedPhoto();
    }
  }

  checkForHighlightedPhoto() {
    // Get the photoId from URL query params
    const params = new URLSearchParams(this.props.location.search);
    const photoId = params.get('photoId');
    
    if (photoId) {
      this.setState({ highlightedPhotoId: photoId });
      // If photos already loaded, set current index to match photoId
      if (this.state.photos && this.state.photos.length) {
        this.setCurrentIndexByPhotoId(photoId);
      } else {
        // Use setTimeout to ensure DOM is ready once photos load
        setTimeout(() => {
          this.scrollToPhoto(photoId);
        }, 100);
      }
    }
  }

  setCurrentIndexByPhotoId(photoId) {
    const idx = this.state.photos.findIndex(p => p._id === photoId);
    if (idx !== -1) {
      this.setState({ currentIndex: idx });
    }
  }

  scrollToPhoto(photoId) {
    const ref = this.photoRefs[photoId];
    if (ref) {
      ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  loadPhotos = () => {
    const userId = this.props.match.params.userId;
    axios.get(`/photosOfUser/${userId}`)
      .then(response => {
        this.setState({ photos: response.data }, () => {
          // After photos are loaded, if URL had a photoId, set currentIndex
          this.checkForHighlightedPhoto();
        });
      })
      .catch(error => {
        console.error('Error fetching photos:', error);
      });
  };

  // NEW: send comment to server, then reload photos
  addComment = (photoId, commentText) => {
    axios.post(`/commentsOfPhoto/${photoId}`, { comment: commentText })
      .then(() => {
        // After successful post, refresh photos so new comment shows up
        this.loadPhotos();
      })
      .catch(error => {
        console.error('Error adding comment:', error);
      });
  };

  // NEW: delete photo
  deletePhoto = (photoId) => {
    if (window.confirm('Are you sure you want to delete this photo? This action cannot be undone.')) {
      axios.delete(`/photos/${photoId}`)
        .then(() => {
          // After successful delete, refresh photos
          this.loadPhotos();
        })
        .catch(error => {
          console.error('Error deleting photo:', error);
          alert('Failed to delete photo. Please try again.');
        });
    }
  };

  // NEW: delete comment
  deleteComment = (commentId) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      axios.delete(`/comments/${commentId}`)
        .then(() => {
          // After successful delete, refresh photos
          this.loadPhotos();
        })
        .catch(error => {
          console.error('Error deleting comment:', error);
          alert('Failed to delete comment. Please try again.');
        });
    }
  };

  // NEW: toggle like on photo
  toggleLike = (photoId) => {
    // Find the photo to check if user has liked it
    const photo = this.state.photos.find(p => p._id === photoId);
    if (!photo) return;

    const isLiked = (photo.likes || []).includes(this.props.currentUserId);
    const endpoint = isLiked ? 'delete' : 'post';
    const url = `/photos/${photoId}/like`;

    axios[endpoint](url)
      .then(response => {
        // Update the photo's likes in state immediately for instant UI feedback
        this.setState(prevState => ({
          photos: prevState.photos.map(p => 
            p._id === photoId 
              ? { 
                  ...p, 
                  likes: isLiked 
                    ? (p.likes || []).filter(id => id !== this.props.currentUserId)
                    : [...(p.likes || []), this.props.currentUserId]
                }
              : p
          )
        }));
      })
      .catch(error => {
        console.error('Error toggling like:', error);
        alert('Failed to update like. Please try again.');
        // Reload photos to revert any optimistic updates
        this.loadPhotos();
      });
  };

  // NEW: toggle favorite on photo
  toggleFavorite = (photoId) => {
    // Find the photo to check if it's already favorited
    const photo = this.state.photos.find(p => p._id === photoId);
    if (!photo) return;

    const isFavorited = photo.isFavorited;
    const endpoint = isFavorited ? 'delete' : 'post';
    const url = `/photos/${photoId}/favorite`;

    axios[endpoint](url)
      .then(response => {
        // Update the photo's favorite status in state immediately for instant UI feedback
        this.setState(prevState => ({
          photos: prevState.photos.map(p => 
            p._id === photoId 
              ? { 
                  ...p, 
                  isFavorited: !isFavorited
                }
              : p
          )
        }));
      })
      .catch(error => {
        console.error('Error toggling favorite:', error);
        alert('Failed to update favorite. Please try again.');
        // Reload photos to revert any optimistic updates
        this.loadPhotos();
      });
  };

  updatePhotoTags = (photoId, updatedTags) => {
    this.setState(prevState => ({
      photos: prevState.photos.map(p =>
        p._id === photoId
          ? { ...p, tags: updatedTags }
          : p
      )
    }));
  };

  render() {
    const { photos, highlightedPhotoId } = this.state;
    if (!photos) return <p>Loading photos...</p>;

    // Single-photo viewer mode: show one photo at a time with stepper
    const { currentIndex } = this.state;
    const total = photos.length;
    const safeIndex = Math.max(0, Math.min(currentIndex || 0, total - 1));
    const currentPhoto = photos[safeIndex];

    const goToIndex = (idx) => {
      if (idx < 0 || idx >= total) return;
      const photo = photos[idx];
      // update URL query param so bookmarking works
      const params = new URLSearchParams(this.props.location.search);
      params.set('photoId', photo._id);
      // Use history.replace to avoid piling up identical states
      if (this.props.history && this.props.history.replace) {
        this.props.history.push({ search: params.toString() });
      } else {
        window.history.pushState({}, '', `?${params.toString()}`);
      }
      this.setState({ currentIndex: idx });
    };

    const handlePrev = () => goToIndex(safeIndex - 1);
    const handleNext = () => goToIndex(safeIndex + 1);

    return (
      <div className="photo-viewer" style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <button onClick={handlePrev} disabled={safeIndex <= 0} style={{ padding: '8px 12px', cursor: safeIndex <= 0 ? 'not-allowed' : 'pointer' }}>
            ◀ Previous
          </button>

          <div style={{ textAlign: 'center' }}>
            <strong>{`Photo ${safeIndex + 1} of ${total}`}</strong>
            <div style={{ fontSize: 12, color: '#666' }}>{currentPhoto ? currentPhoto.file_name : ''}</div>
          </div>

          <button onClick={handleNext} disabled={safeIndex >= total - 1} style={{ padding: '8px 12px', cursor: safeIndex >= total - 1 ? 'not-allowed' : 'pointer' }}>
            Next ▶
          </button>
        </div>

        {currentPhoto ? (
          <PhotoCard 
            key={currentPhoto._id}
            photo={currentPhoto}
            onAddComment={this.addComment}
            onPhotoDelete={this.deletePhoto}
            onCommentDelete={this.deleteComment}
            onLikeToggle={this.toggleLike}
            onFavoriteToggle={this.toggleFavorite}
            onTagUpdate={this.updatePhotoTags}
            currentUserId={this.props.currentUserId}
            isHighlighted={highlightedPhotoId === currentPhoto._id}
          />
        ) : (
          <Typography variant="body2">No photos for this user</Typography>
        )}
      </div>
    );
  }
}

export default UserPhotos;
