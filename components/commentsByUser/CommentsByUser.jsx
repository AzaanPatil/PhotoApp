import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import { List, ListItem, ListItemText, Avatar, Box, Typography, Divider } from '@mui/material';

export default function CommentsByUser(props) {
  const { userId } = useParams();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    axios.get(`/commentsOfUser/${userId}`)
      .then(res => {
        setComments(res.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching comments of user:', err);
        setComments([]);
        setLoading(false);
      });
  }, [userId]);

  return (
    <div>
      <Typography variant="h6" sx={{ mb: 2 }}>Comments by User</Typography>
      {loading ? (
        <Typography variant="body2">Loading...</Typography>
      ) : comments.length === 0 ? (
        <Typography variant="body2">No comments found for this user.</Typography>
      ) : (
        <List>
          {comments.map(item => (
            <React.Fragment key={item.comment_id}>
              <ListItem alignItems="flex-start" component={Link} to={`/photos/${item.photo_owner_id}?photoId=${item.photo_id}`} sx={{ textDecoration: 'none' }}>
                <Avatar variant="square" src={`/images/${item.file_name}`} sx={{ width: 64, height: 48, mr: 2 }} />
                <ListItemText
                  primary={item.comment}
                  secondary={new Date(item.date_time).toLocaleString()}
                />
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
        </List>
      )}
    </div>
  );
}
