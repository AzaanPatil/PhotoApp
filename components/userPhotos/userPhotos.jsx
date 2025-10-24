import React from 'react';
import { 
  Typography, 
  Card, 
  CardContent, 
  Divider 
} from '@mui/material';
import { Link } from 'react-router-dom';
import './userPhotos.css';



const prettyDate = (parm) => new Date(parm).toLocaleString();
function PhotoCard({ photo }) {
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
    const { userId } = this.props.match.params;
    const photos = window.models.photoOfUserModel(userId) || [];
    this.setState({photos});
  };

  render() {
    const {photos} = this.state;
    return (
      <div className="photos">
        {photos.map((p) => (
          <PhotoCard key={p._id} photo={p} />
        ))}
        {photos.length === 0 && (
          <Typography variant="body2">No photos for this user</Typography>
        )}
      </div>
    );
  }
}

export default UserPhotos;