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

function PhotoCard({ photo, onAddComment }) {
  const [commentText, setCommentText] = React.useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = commentText.trim();
    if (!trimmed) {
      return; // frontend guard; server also rejects empty
    }
    onAddComment(photo._id, trimmed);
    setCommentText('');
  };

  return (
    <Card className="photo-card" sx={{ mb: 2 }}>
      <img
        className="photo-img"
        src={`/images/${photo.file_name}`}
        alt="user upload"
      />
      <CardContent>
        <Typography variant="caption">
          Taken: {prettyDate(photo.date_time)}
        </Typography>
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
              <Typography variant="body2">{c.comment}</Typography>
            </div>
          ))}
        </div>

        {/* New comment input (minimal UI) */}
        <form onSubmit={handleSubmit} style={{ marginTop: 8 }}>
          <input
            type="text"
            value={commentText}
            placeholder="Add a comment..."
            onChange={(e) => setCommentText(e.target.value)}
            style={{ width: '70%', marginRight: 8, padding: 4 }}
          />
          <button type="submit">Post</button>
        </form>
      </CardContent>
    </Card>
  );
}

class UserPhotos extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      photos: []
    };
  }
  
  componentDidMount() {
    this.loadPhotos();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.match.params.userId !== this.props.match.params.userId) {
      this.loadPhotos();
    }
  }

  loadPhotos = () => {
    const userId = this.props.match.params.userId;
    axios.get(`/photosOfUser/${userId}`)
      .then(response => {
        this.setState({ photos: response.data });
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

  render() {
    const { photos } = this.state;
    if (!photos) return <p>Loading photos...</p>;
    return (
      <div className="photos">
        {photos.map((p) => (
          <PhotoCard 
            key={p._id} 
            photo={p} 
            onAddComment={this.addComment}
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
