# Photo Tagging Feature Implementation

## Overview
A comprehensive photo tagging system that allows users to select rectangular regions on photos, tag people in those regions, and display tags with hover tooltips. This feature includes full permission controls and responsive positioning.

## Architecture

### 1. **Database Schema** (`schema/photo.js`)
```javascript
// Tag subdocument within Photo
tagSchema = {
  user_id: ObjectId,        // Reference to tagged user
  position: {
    x: Number,              // 0-1 normalized x position (left)
    y: Number,              // 0-1 normalized y position (top)
    width: Number,          // 0-1 normalized width
    height: Number          // 0-1 normalized height
  },
  created_by: ObjectId,     // User who created the tag (for deletion permissions)
  date_time: Date           // When tag was created
}
```

**Key Design Decision**: Relative positioning (0-1 scale) ensures tags scale correctly with responsive image sizes.

### 2. **Backend API Endpoints** (`webServer.js`)

#### POST `/photos/:photo_id/tags`
Creates a new tag on a photo.
- **Request Body**:
  ```json
  {
    "user_id": "userId",
    "position": {
      "x": 0.25,
      "y": 0.15,
      "width": 0.2,
      "height": 0.3
    }
  }
  ```
- **Validation**:
  - Position values must be between 0 and 1
  - Width and height must be > 0.01
  - User must not already be tagged in overlapping region
  - Tagged user must exist

#### DELETE `/photos/:photo_id/tags/:tag_id`
Removes a tag from a photo.
- **Permission**: Only the user who created the tag can delete it
- **Validation**: Ensures tag exists and photo exists

#### GET `/photos/ofUser/:user_id` (Enhanced)
Returns all photos with full tag information including:
- Tag position data
- Tagged user information (populated)
- Creator information for each tag

### 3. **Frontend Component** (`components/userPhotos/userPhotos.jsx`)

#### PhotoCard Component State
```javascript
// Tag-related state
const [isSelecting, setIsSelecting] = useState(false);
const [selectionRect, setSelectionRect] = useState(null);
const [selectedUserId, setSelectedUserId] = useState('');
const [imageRect, setImageRect] = useState(null);
const [hoveredTag, setHoveredTag] = useState(null);
const imageRef = useRef(null);
```

#### Mouse Interaction Handlers
1. **handleImageMouseDown**: Initiates rectangle selection
2. **handleImageMouseMove**: Updates selection rectangle as user drags
3. **handleImageMouseUp**: Finalizes selection, shows user dropdown

#### Tag Management Functions
1. **handleTagSubmit**: Creates tag via API call
2. **handleTagDelete**: Removes tag with permission checks

#### Visual Elements

**Selection Rectangle** (During Selection):
- Blue border: `#1976d2`
- Semi-transparent blue background
- Updates in real-time as user drags

**Tag Rectangles** (Existing Tags):
- Green border: `#4caf50`
- Hover to see user tooltip
- Click to delete (if permission granted)

**Hover Tooltip**:
- Shows tagged user's name
- Displays "Remove" button if current user created the tag
- Positioned above the tag rectangle

## User Interaction Flow

### Creating a Tag
1. User clicks and drags on photo to select rectangular region
2. Selection rectangle appears with blue outline
3. On mouse up, dropdown appears with user list
4. User selects person to tag
5. Click "Create Tag" button
6. Tag is created and displayed with green outline

### Viewing Tags
- Hover over green rectangle to see tagged user's name
- Green border indicates existing tags (vs. blue for selection)

### Deleting Tags
- Hover over tag rectangle to reveal tooltip
- Only tag creator sees "Remove" button
- Click remove to delete tag

## Technical Implementation Details

### Relative Positioning System
Tags use normalized coordinates (0-1) rather than pixels:
- Calculated from image position: `(clientX - imageRect.left) / imageRect.width`
- Applies to all: x, y, width, height
- Ensures tags scale with responsive image resizing

### Image Rectangle Tracking
```javascript
useEffect(() => {
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
```

### Selection vs. Final Tag Display
- **During selection** (`selectionRect.startX` defined): Blue outline, user dropdown visible
- **After selection** (`selectionRect.startX` undefined): Tag created, green outline, user tooltip visible

### Permission Model
- **Tag Creation**: Any logged-in user can tag any person in a photo
- **Tag Deletion**: Only the user who created the tag can delete it
- Backend enforces permissions with `created_by === req.user.id` check

## Validation Rules

### Position Validation
```javascript
if (width > 0.01 && height > 0.01) {
  // Valid selection
}
```
Minimum 1% of image in each dimension prevents accidental selections.

### Duplicate Prevention
Backend checks for existing tags before creating new ones (if implemented).

### User Existence Verification
Backend confirms tagged user exists before creating tag.

## CSS Classes and Styling

### Photo Container
```css
position: relative;
display: inline-block;
width: 100%;
cursor: crosshair;  /* During selection */
```

### Selection Rectangle
```css
position: absolute;
border: 2px solid #1976d2;
background-color: rgba(25, 118, 210, 0.1);
box-sizing: border-box;
```

### Tag Rectangle
```css
position: absolute;
border: 2px solid #4caf50;
box-sizing: border-box;
```

### Hover Tooltip
```css
position: absolute;
top: -30px;
background-color: #333;
color: white;
padding: 4px 8px;
border-radius: 4px;
z-index: 1000;
```

## Error Handling

### Frontend Validation
- Selection must be > 1% width and height
- User must be selected before submitting tag
- Minimum positioning values

### Backend Validation
- Position coordinates between 0 and 1
- Width and height > 0
- User exists
- Photo exists
- Permission check for deletion

### User Feedback
- Alert dialogs for API errors
- Selection rect provides visual feedback
- Hover tooltips confirm tag presence

## Responsive Design Considerations

1. **Image Scaling**: Tags automatically scale because they use relative coordinates
2. **Scroll Position**: Image rect is recalculated via `getBoundingClientRect()` which accounts for scroll
3. **Window Resize**: Event listener updates image rect on resize
4. **Overflow**: Tooltip positioning may need adjustment if photo is near viewport edge

## Testing Checklist

- [ ] Create tag on different photo sizes
- [ ] Verify tags scale correctly on window resize
- [ ] Test deletion permissions (creator vs. non-creator)
- [ ] Verify error handling for invalid selections
- [ ] Check tooltip positioning at image edges
- [ ] Test with multiple tags on same photo
- [ ] Verify tag data persists on page refresh
- [ ] Test on scrolled pages
- [ ] Verify relative positioning accuracy
- [ ] Test with different user roles

## Future Enhancements

1. **Tag Editing**: Allow repositioning or updating tags
2. **Bulk Tags**: Create multiple tags without page reload
3. **Tag Notifications**: Notify users when tagged in photos
4. **Tag Management**: Show all tags for a user across photos
5. **Tag Suggestions**: Auto-suggest users based on face detection (AI)
6. **Tag Search**: Filter photos by tagged users
7. **Tag History**: View tag creation and deletion audit trail
8. **Private Tags**: Owner-only visible tags for friends or specific groups

## Dependencies

- **Frontend**: React, Axios, Material-UI
- **Backend**: Express, Mongoose, MongoDB
- **Validation**: Server-side with Mongoose schema

## Files Modified

1. `schema/photo.js` - Added tagSchema and tags array
2. `webServer.js` - Added tag endpoints and enhanced GET /photos/ofUser/:user_id
3. `components/userPhotos/userPhotos.jsx` - Implemented tag UI and interaction handlers
