# Photo Tagging Feature - Visual Guide

## User Interface Layout

### Photo Display Area
```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  [Image Container - Cursor: Crosshair]             │
│  ┌─────────────────────────────────────────────┐   │
│  │                                             │   │
│  │  [Photo Image]                              │   │
│  │  ┌────────┐          ┌──────────┐          │   │
│  │  │ BLUE   │ (during) │ GREEN    │ (existing)  │   │
│  │  │ Select │  select  │ Tag      │          │   │
│  │  └────────┘          └──────────┘          │   │
│  │    Rectangle            Rectangle          │   │
│  │                                             │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Tag Creation Flow

### Step 1: Select Region
```
User drags from top-left to bottom-right:
  START ●
   │
   ├─ Mouse Move (updates rectangle)
   │
   └─ Mouse Up ●
      END
```

Visual Feedback:
```
┌──────────────────────────┐
│                          │
│  ┌──────────────────┐    │
│  │ Blue Rectangle   │    │
│  │ (2px border)     │    │
│  │ (10% alpha bg)   │    │
│  └──────────────────┘    │
│                          │
└──────────────────────────┘
```

### Step 2: User Selection
```
┌──────────────────────────┐
│                          │
│  Tag User Selection Bar  │
│  ┌──────────────────┐    │
│  │ Select a user ▼  │    │
│  ├──────────────────┤    │
│  │ Alice Johnson    │    │
│  │ Bob Smith        │    │
│  │ Carol Davis      │    │
│  └──────────────────┘    │
│                          │
│  [Create Tag] [Cancel]   │
│                          │
└──────────────────────────┘
```

### Step 3: Tag Created
```
┌──────────────────────────┐
│                          │
│  ┌──────────────────┐    │
│  │ Green Rectangle  │    │
│  │ (2px border)     │    │
│  │ (existing tag)   │    │
│  └──────────────────┘    │
│                          │
└──────────────────────────┘
```

## Hover Interaction

### On Tag Hover
```
        ┌─────────────────────┐
        │ Alice Johnson [X]   │  <- Tooltip
        └─────────────────────┘
                  △
              (if creator)
┌──────────────────────────┐
│                          │
│  ┌──────────────────┐    │
│  │ Green Rectangle  │    │
│  │ (2px green)      │    │
│  │ (highlighted)    │    │
│  └──────────────────┘    │
│                          │
└──────────────────────────┘
```

## Tag Rectangle Components

### Selection Rectangle (During Selection)
```
Color:       #1976d2 (blue)
Border:      2px solid
Background:  rgba(25, 118, 210, 0.1) - 10% opacity
Position:    Absolute, percentage-based
Cursor:      Crosshair on parent
```

### Tag Rectangle (Existing Tag)
```
Color:       #4caf50 (green)
Border:      2px solid
Background:  Transparent
Position:    Absolute, percentage-based (relative)
Cursor:      Pointer (hover enables interaction)
```

### Hover Tooltip
```
Background:  #333 (dark gray)
Text Color:  White
Padding:     4px 8px
Border Rad:  4px
Position:    Absolute (top: -30px, left: 0)
Z-Index:     1000 (above everything)
Font Size:   12px
White Space: Nowrap
```

## Tag Control Panel

### When Selection Made (Before User Selection)
```
┌─────────────────────────────────┐
│ Tag this person:                │
│ ┌─────────────────────────────┐ │
│ │ -- Select a user --       ▼ │ │  (dropdown)
│ └─────────────────────────────┘ │
│ ┌──────────────┬──────────────┐ │
│ │ Create Tag   │    Cancel    │ │  (buttons)
│ └──────────────┴──────────────┘ │
└─────────────────────────────────┘
```

**States**:
- Create Tag button: Gray/disabled until user selected
- Cancel button: Always active (red #999)

### During Tag Submission
- Dropdown populated with all users from `/user/list`
- "Create Tag" disabled until user selected
- "Cancel" clears selection and hides panel

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  1. User Mouse Events (down, move, up)              │
│     ├─ handleImageMouseDown → startX, startY       │
│     ├─ handleImageMouseMove → endX, endY (updates) │
│     └─ handleImageMouseUp → finalize rectangle     │
│                                                     │
│  2. User Selection                                  │
│     └─ handleTagSubmit                              │
│        ├─ POST /photos/:photo_id/tags              │
│        └─ onTagUpdate (parent callback)             │
│                                                     │
│  3. Backend Processing                              │
│     ├─ Validate position (0-1 range)               │
│     ├─ Validate user exists                         │
│     ├─ Create tag document                          │
│     └─ Return populated tag data                    │
│                                                     │
│  4. Frontend Update                                 │
│     ├─ Clear selection rectangle                    │
│     ├─ Add to photo.tags array                      │
│     ├─ Render green rectangles                      │
│     └─ Ready for next tag                           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Position Coordinate System

### Relative Positioning (0-1 Scale)
```
(0, 0) ┌────────────────────────────────────┐ (1, 0)
       │                                    │
       │  Tag Position:                     │
       │  x = 0.25 (25% from left)         │
       │  y = 0.20 (20% from top)          │
       │                                    │
       │    ┌──────────┐                    │
       │    │  0.25    │                    │
       │    │ 0.20     │                    │
       │    │  (size)  │                    │
       │    └──────────┘                    │
       │                                    │
       │                                    │
(0, 1) └────────────────────────────────────┘ (1, 1)
```

**Calculation**:
```javascript
x = (mouseX - imageLeft) / imageWidth   // 0 to 1
y = (mouseY - imageTop) / imageHeight   // 0 to 1
```

**Rendering Back**:
```javascript
left = x * 100 + '%'      // CSS percentage
top = y * 100 + '%'       // CSS percentage
width = width * 100 + '%'
height = height * 100 + '%'
```

## Permission Model

### Creating Tags
```
✓ Any logged-in user can tag any person
✓ No restrictions on who tags whom
✓ Multiple users can tag same person in same region
```

### Deleting Tags
```
✓ Only tag creator can delete
✗ Other users cannot delete
  
Creator Check:
  tag.created_by === currentUserId → Show "Remove" button
```

## Error Scenarios

### Invalid Selection (Too Small)
```
Width or Height < 0.01 (1%)
    ↓
Selection rect clears
    ↓
No dropdown appears
    ↓
User can try again
```

### No User Selected
```
User clicks "Create Tag" without selecting user
    ↓
Button disabled (visual feedback)
    ↓
No API call made
```

### API Errors
```
Server returns error
    ↓
Alert dialog shown to user
    ↓
Selection remains (user can retry or cancel)
```

## Responsive Design

### Window Resize
```
User resizes browser
    ↓
window.addEventListener('resize') fires
    ↓
updateImageRect() recalculates image position
    ↓
All tags automatically scale (percentage-based)
    ↓
Mouse calculations use new imageRect
```

### Image Load
```
useEffect([photo])
    ↓
Image bounds calculated via getBoundingClientRect()
    ↓
Event listeners attached
    ↓
Ready for tagging
```

## Color Scheme

| Element | Color | Hex | Usage |
|---------|-------|-----|-------|
| Selection Border | Blue | #1976d2 | During drag selection |
| Selection BG | Light Blue | rgba(25,118,210,0.1) | Visual feedback |
| Tag Border | Green | #4caf50 | Existing tags |
| Tooltip BG | Dark Gray | #333 | Hover info |
| Tooltip Text | White | #fff | Text on tooltip |
| Create Button | Green | #4caf50 | Action button |
| Cancel Button | Gray | #999 | Cancel action |
| Delete Button | Red | #f44336 | Destructive action |

## Keyboard Support

Currently: Click/drag only

Future enhancements could include:
- Esc to cancel selection
- Tab to navigate dropdown
- Enter to confirm tag
- Delete key to remove hovered tag
