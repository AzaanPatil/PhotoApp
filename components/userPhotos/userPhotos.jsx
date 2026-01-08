import React from 'react';
import axios from 'axios';
import { 
  Typography, 
  Card, 
  CardContent, 
  Divider 
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

function PhotoCard({ photo, onAddComment, isHighlighted, photoRef, currentUserId, onPhotoDelete, onCommentDelete }) {
  const [commentText, setCommentText] = React.useState('');
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState([]);
  const [users, setUsers] = React.useState([]);
  const [cursorPosition, setCursorPosition] = React.useState(0);
  const inputRef = React.useRef(null);

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

  return (
    <Card 
      className={`photo-card ${isHighlighted ? 'highlighted' : ''}`}
      ref={photoRef}
      sx={{ mb: 2 }}
    >
      <img
        className="photo-img"
        src={`/images/${photo.file_name}`}
        alt="user upload"
      />
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
        
        <Divider sx={{ my: 1 }} />
        
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
      highlightedPhotoId: null
    };
    this.photoRefs = {};
  }
  
  componentDidMount() {
    this.loadPhotos();
    this.checkForHighlightedPhoto();
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
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        this.scrollToPhoto(photoId);
      }, 100);
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
        this.setState({ photos: response.data });
        // After photos are loaded, check if we need to highlight and scroll
        setTimeout(() => {
          this.checkForHighlightedPhoto();
        }, 50);
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

  render() {
    const { photos, highlightedPhotoId } = this.state;
    if (!photos) return <p>Loading photos...</p>;
    return (
      <div className="photos">
        {photos.map((p) => (
          <PhotoCard 
            key={p._id} 
            photo={p} 
            onAddComment={this.addComment}
            onPhotoDelete={this.deletePhoto}
            onCommentDelete={this.deleteComment}
            currentUserId={this.props.currentUserId}
            isHighlighted={highlightedPhotoId === p._id}
            photoRef={(ref) => { if (ref) this.photoRefs[p._id] = ref; }}
          />
        ))}
        {photos.length === 0 && (
          <Typography variant="body2">No photos for this user</Typography>
        )}
      </div>
    );
  }
}

export default UserPhotos;
