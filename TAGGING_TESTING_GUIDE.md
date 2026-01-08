# Photo Tagging Feature - Testing Guide

## Pre-Testing Setup

### Database State
- Ensure MongoDB is running
- Database should have at least 2-3 users with photos
- User accounts needed:
  - User A (for photo owner)
  - User B (to tag in photos)
  - User C (additional user for verification)

### Server State
- Start Node.js server: `node webServer.js`
- Verify server listening on configured port
- Check for any startup errors in console

### Application State
- Clear browser cache (Ctrl+Shift+Delete)
- Log in as User A
- Navigate to photos section
- Verify User A has at least one photo to tag

---

## Manual Testing Procedures

### Test 1: Tag Creation with Rectangle Selection
**Objective**: Verify users can draw rectangles on photos and create tags

**Steps**:
1. Open User A's photo
2. Click and drag on photo to create rectangle
   - Start position: top-left area of photo (around 25% from left, 20% from top)
   - End position: drag to create visible rectangle (at least 50x50 pixels)
3. On mouse release, observe:
   - Blue rectangle appears with 2px border
   - User selection dropdown appears
   - Selection shows in dropdown

**Expected Results**:
- ✓ Blue rectangle appears during drag
- ✓ Rectangle has light blue background (10% opacity)
- ✓ User dropdown appears after mouse up
- ✓ Dropdown shows list of users from database

**Pass/Fail**: [  ]

### Test 2: Tag Submission
**Objective**: Verify tag can be created and saved to database

**Steps**:
1. From Test 1 state (rectangle selected, dropdown showing)
2. Select "User B" from dropdown
3. Click "Create Tag" button
4. Observe response

**Expected Results**:
- ✓ "Create Tag" button enabled when user selected
- ✓ Button disabled before user selection
- ✓ API call succeeds (check Network tab)
- ✓ Tag rectangle changes from blue to green
- ✓ Green tag appears on photo
- ✓ Selection interface disappears

**Pass/Fail**: [  ]

### Test 3: Tag Display and Tooltips
**Objective**: Verify existing tags display correctly and tooltips work

**Steps**:
1. From Test 2 state (tag created)
2. Refresh page to reload tag data
3. Navigate back to same photo
4. Hover over green rectangle
5. Move mouse away from rectangle

**Expected Results**:
- ✓ Green tag rectangle visible on page load
- ✓ Tooltip appears on hover showing user's name
- ✓ Tooltip has dark background (#333)
- ✓ Tooltip disappears when mouse leaves tag area
- ✓ Tooltip positioned above tag (approximately)

**Pass/Fail**: [  ]

### Test 4: Tag Deletion (Creator Permission)
**Objective**: Verify tag creator can delete tags

**Steps**:
1. From Test 3 state (viewing tag)
2. Hover over green rectangle
3. Look for "Remove" button in tooltip
4. Click "Remove" button
5. Observe changes

**Expected Results**:
- ✓ "Remove" button visible on hover (red button)
- ✓ Click removes tag from photo
- ✓ Green rectangle disappears
- ✓ API DELETE request succeeds
- ✓ Change persists on page refresh

**Pass/Fail**: [  ]

### Test 5: Tag Deletion (Non-Creator Permission)
**Objective**: Verify non-creator cannot delete tags

**Steps**:
1. Create tag as User A (repeat Tests 1-2)
2. Log out and log in as User B
3. Navigate to User A's photo
4. Hover over green tag rectangle
5. Look for "Remove" button

**Expected Results**:
- ✓ User B sees tag tooltip with user's name
- ✓ "Remove" button NOT visible (only creator sees it)
- ✓ Tooltip shows only user name
- ✓ Cannot delete tag created by User A

**Pass/Fail**: [  ]

### Test 6: Multiple Tags on Same Photo
**Objective**: Verify multiple tags can exist on same photo

**Steps**:
1. Log in as User A
2. On same photo, create 3 different tags:
   - Tag in upper-left area (select User B)
   - Tag in center area (select User C)
   - Tag in lower-right area (select User B again)
3. Hover over each tag to verify

**Expected Results**:
- ✓ All 3 green rectangles visible
- ✓ Each tag shows correct user name on hover
- ✓ All tags have independent positions
- ✓ Can delete individual tags without affecting others

**Pass/Fail**: [  ]

### Test 7: Invalid Selection (Too Small)
**Objective**: Verify small selections are rejected

**Steps**:
1. On photo, click and drag very small rectangle
   - Move mouse less than 1% of image width/height
   - Examples: 5-10 pixels on standard image
2. On mouse up, observe

**Expected Results**:
- ✓ Selection rectangle appears while dragging
- ✓ On mouse up, rectangle disappears
- ✓ Dropdown does NOT appear
- ✓ No tag created
- ✓ User can try again with larger selection

**Pass/Fail**: [  ]

### Test 8: Selection Cancellation
**Objective**: Verify users can cancel tag selection

**Steps**:
1. Create selection rectangle on photo
2. Dropdown appears with user list
3. Click "Cancel" button
4. Observe

**Expected Results**:
- ✓ Selection rectangle disappears
- ✓ Dropdown closes
- ✓ No tag created
- ✓ Photo returns to normal state
- ✓ User can select new region

**Pass/Fail**: [  ]

### Test 9: Window Resize with Tags
**Objective**: Verify tags scale correctly when window resizes

**Steps**:
1. Create 2-3 tags on photo
2. Make browser window narrower (resize from right edge)
3. Observe tag positions
4. Make browser window wider again
5. Verify tags return to original positions

**Expected Results**:
- ✓ Tags maintain their relative positions
- ✓ Tags scale proportionally with image
- ✓ Tag rectangles remain aligned to correct areas
- ✓ Aspect ratio preserved
- ✓ Mouse selection still accurate after resize

**Pass/Fail**: [  ]

### Test 10: Tag Positioning Accuracy
**Objective**: Verify tags position correctly at different locations

**Steps**:
1. Create tags at specific positions:
   - Top-left corner (x=0.05, y=0.05)
   - Center (x=0.40, y=0.40)
   - Bottom-right corner (x=0.85, y=0.85)
2. Verify visual positioning matches selection
3. Save and refresh page
4. Verify positions unchanged

**Expected Results**:
- ✓ Tags appear at selected areas
- ✓ Relative positioning accurate
- ✓ Tags persist with same position after reload
- ✓ Position values stored correctly in database

**Pass/Fail**: [  ]

### Test 11: Scrolled Page Selection
**Objective**: Verify tagging works on scrolled pages

**Steps**:
1. Navigate to photos page with scroll content above
2. Scroll down so photo is partially visible
3. Attempt to create tag on photo
4. Verify rectangle accuracy

**Expected Results**:
- ✓ Rectangle selection accurate despite scroll
- ✓ Mouse coordinates calculated correctly
- ✓ Tag created at intended position
- ✓ No offset errors from scroll position

**Pass/Fail**: [  ]

### Test 12: API Error Handling
**Objective**: Verify errors are handled gracefully

**Steps**:
1. Open browser DevTools Network tab
2. Create tag normally
3. Block network request and try to create tag
4. Verify error handling

**Expected Results**:
- ✓ Error alert shown to user
- ✓ Clear error message displayed
- ✓ Selection remains (user can retry)
- ✓ No console errors

**Pass/Fail**: [  ]

### Test 13: User List Population
**Objective**: Verify dropdown shows correct users

**Steps**:
1. Create selection rectangle
2. Examine dropdown user list
3. Verify names match database users
4. Check sorting/ordering

**Expected Results**:
- ✓ All active users appear in dropdown
- ✓ User names formatted correctly
- ✓ No duplicate users
- ✓ Can scroll in dropdown if many users

**Pass/Fail**: [  ]

### Test 14: Cross-Browser Testing
**Objective**: Verify feature works across browsers

**Browsers to Test**:
- Chrome/Chromium
- Firefox
- Edge
- Safari (if available)

**Test Steps**: Repeat Test 1-3 in each browser

**Expected Results**:
- ✓ Tags work in all browsers
- ✓ Mouse events consistent
- ✓ Positioning accurate
- ✓ Tooltips display correctly
- ✓ No visual artifacts

**Pass/Fail**: [  ]

### Test 15: Photo Sharing Permissions
**Objective**: Verify tag visibility respects photo permissions

**Steps**:
1. User A creates private photo with tag
2. User B not on sharing list
3. User B tries to access User A's photos
4. Verify photo not visible

**Expected Results**:
- ✓ Private photo not displayed to non-shared user
- ✓ Tags inherit photo visibility
- ✓ Shared photos show tags to shared users
- ✓ Public photos show tags to all users

**Pass/Fail**: [  ]

---

## Database Verification Tests

### DB Test 1: Tag Data Structure
**Check**:
```javascript
db.photos.findOne({ tags: { $exists: true, $ne: [] } }).tags[0]
```

**Expected Structure**:
```javascript
{
  _id: ObjectId,
  user_id: ObjectId(users),
  created_by: ObjectId(users),
  x: Number (0-1),
  y: Number (0-1),
  width: Number (0-1),
  height: Number (0-1),
  date_time: Date
}
```

**Pass/Fail**: [  ]

### DB Test 2: Tag Persistence
**Check**:
1. Create tag and verify in UI
2. Query database directly
3. Verify tag data exists with correct values

**Expected Results**:
- ✓ Tag appears in photo.tags array
- ✓ All position fields populated
- ✓ user_id and created_by match correct users
- ✓ date_time is set

**Pass/Fail**: [  ]

### DB Test 3: Tag Deletion
**Check**:
1. Delete tag via UI
2. Query database
3. Verify tag removed from array

**Expected Results**:
- ✓ Tag removed from photo.tags array
- ✓ Other tags unaffected
- ✓ Photo document intact

**Pass/Fail**: [  ]

---

## Performance Tests

### Perf Test 1: Large Number of Tags
**Objective**: Verify performance with many tags on one photo

**Steps**:
1. Create 20+ tags on single photo
2. Observe page load time
3. Test hover interactions
4. Test tag deletion

**Expected Results**:
- ✓ Page loads within 2 seconds
- ✓ Hover interactions responsive (< 100ms)
- ✓ Tag deletion completes quickly
- ✓ No console errors

**Pass/Fail**: [  ]

### Perf Test 2: Multiple Photos with Tags
**Objective**: Verify performance with many photos/tags

**Steps**:
1. Load user with 50+ photos, 100+ tags total
2. Measure page load time
3. Scroll through photos
4. Test interactions

**Expected Results**:
- ✓ Initial load < 3 seconds
- ✓ Smooth scrolling
- ✓ Hover responses quick
- ✓ No memory leaks

**Pass/Fail**: [  ]

---

## Edge Cases

### Edge Case 1: Tag at Image Boundary
**Test**: Create tag at very edge (x=0, y=0, width=0.05, height=0.05)

**Expected**: Tag displays correctly at corner

### Edge Case 2: Large Tag (Full Image)
**Test**: Create tag covering entire image (x=0, y=0, width=1, height=1)

**Expected**: Full-image rectangle appears

### Edge Case 3: Rapid Tag Creation
**Test**: Quickly create multiple tags without waiting for response

**Expected**: All tags created successfully, no race conditions

### Edge Case 4: Tag Same User Twice
**Test**: Tag same person in two different regions of photo

**Expected**: Both tags created independently

### Edge Case 5: Delete and Recreate
**Test**: Delete tag, then create new tag in same area

**Expected**: New tag created, old tag completely removed

---

## Test Summary Template

```
TESTING SESSION SUMMARY
======================

Date: ____________
Tester: ____________
Browser: ____________
OS: ____________

Feature: Photo Tagging System
Version: 1.0

RESULTS:
--------
Total Tests: 29
Passed: [  ]
Failed: [  ]
Skipped: [  ]

FAILURES FOUND:
1. [Test #] - Description
   - Expected: ...
   - Actual: ...
   - Steps to Reproduce: ...

2. [Test #] - Description
   ...

NOTES:
------
[Observations, suggestions, or additional findings]

SIGN-OFF:
---------
Ready for Production: YES [ ] NO [ ]
```

---

## Test Data Setup Script

If needed, create test data using:

```bash
# Create test users
node -e "
const users = [
  { first_name: 'Alice', last_name: 'Johnson' },
  { first_name: 'Bob', last_name: 'Smith' },
  { first_name: 'Carol', last_name: 'Davis' }
];
// Insert into database
"

# Upload test photos
# (Use UI or API endpoints)
```

---

## Continuous Testing

### After Each Code Change
1. Run Test 1-4 (core functionality)
2. Run Test 9 (responsive design)
3. Run Test 12 (error handling)

### Before Each Release
1. Run all 15 manual tests
2. Run all 3 database tests
3. Run both performance tests
4. Test all edge cases

### On Production Issues
1. Identify failing test number
2. Document reproduction steps
3. Check database structure
4. Review recent changes
5. Apply fix and re-run test
