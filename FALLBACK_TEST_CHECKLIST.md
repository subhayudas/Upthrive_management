# Backend Fallback Test Checklist

This checklist helps verify that all features work correctly when the backend is unavailable.

## Prerequisites
1. ✅ Set up `.env` file with Supabase credentials
2. ✅ Ensure Supabase project has the correct schema
3. ✅ Verify `request-files` bucket exists in Supabase Storage

## Testing Steps

### 1. Authentication Tests
**Test without backend:**
- [ ] Login with existing user credentials
- [ ] Register new user (different roles)
- [ ] Logout functionality
- [ ] Auto-login on page refresh
- [ ] Profile updates

**Expected behavior:**
- Success messages should include "(Using direct connection)"
- Console should show "✅ [Feature] loaded using Supabase fallback"

### 2. Request Management Tests
**Test without backend:**
- [ ] View requests (filtered by user role)
- [ ] Create new request with file uploads
- [ ] Assign request to editor (manager only)
- [ ] Submit completed work (editor only)
- [ ] Manager review (approve/reject)
- [ ] Client review (approve/reject)

**Specific tests:**
- [ ] Client sees only their requests
- [ ] Manager sees all requests
- [ ] Editor sees only assigned requests
- [ ] File uploads work and display correctly

### 3. Content Calendar Tests
**Test without backend:**
- [ ] View CC list items
- [ ] Create CC item with media files
- [ ] Edit existing CC item
- [ ] Delete CC item (role permissions)
- [ ] Client/Manager access control

**File upload tests:**
- [ ] Multiple file uploads
- [ ] Image and video files
- [ ] File size validation (100MB limit)
- [ ] File type validation

### 4. Dashboard & Calendar Tests
**Test without backend:**
- [ ] Dashboard loads with correct statistics
- [ ] Recent activity displays
- [ ] Calendar view shows scheduled items
- [ ] Client selection works (manager/editor)

### 5. User Management Tests
**Test without backend:**
- [ ] Get list of clients (manager/editor)
- [ ] Get list of editors (manager)
- [ ] User profile updates
- [ ] Role-based access control

## How to Test Backend Fallback

### Method 1: Stop Backend Server
```bash
# Stop your backend server
# Keep frontend running
npm run client
```

### Method 2: Change API URL
```bash
# In client/.env
REACT_APP_API_URL=http://nonexistent-server:9999
```

### Method 3: Block Network Requests
- Open Developer Tools
- Go to Network tab
- Right-click and "Block request URL"
- Block requests to your API_BASE_URL

## Expected Visual Indicators

### Success Messages
- Login: "Login successful! (Using direct connection)"
- Create: "Request created successfully! (Using direct connection)"
- Update: "CC item updated successfully! (Using direct connection)"

### Console Logs
- "🔄 Backend unavailable, will use Supabase fallback for future requests"
- "🔄 Using Supabase fallback"
- "✅ Requests loaded using Supabase fallback"
- "✅ Clients loaded using Supabase fallback"

### Error Handling
- If Supabase is not configured: "Supabase not configured"
- If authentication fails: "Not authenticated"
- If permissions denied: "Access denied"

## Common Issues & Solutions

### Issue: "Supabase not configured"
**Solution:** 
- Check `.env` file has correct REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY
- Restart development server after adding env vars

### Issue: Authentication not working
**Solution:**
- Verify Supabase project URL and anon key are correct
- Check RLS policies are set up in Supabase
- Ensure user exists in both auth.users and profiles table

### Issue: File uploads failing
**Solution:**
- Create `request-files` bucket in Supabase Storage
- Set bucket to public or configure appropriate policies
- Check file size and type restrictions

### Issue: Database errors
**Solution:**
- Verify database schema matches expected structure
- Check RLS policies allow the operations
- Ensure foreign key relationships are correct

### Issue: Empty data or permission denied
**Solution:**
- Check user's role and client_id in profiles table
- Verify RLS policies for the user's role
- Check data exists in the expected tables

## Verification Commands

### Check Supabase Configuration
```javascript
// In browser console
console.log('Supabase URL:', process.env.REACT_APP_SUPABASE_URL);
console.log('Supabase Key:', process.env.REACT_APP_SUPABASE_ANON_KEY ? 'Set' : 'Missing');
```

### Test Direct Supabase Connection
```javascript
// In browser console (after login)
import { supabase } from './src/config/supabase';
const { data, error } = await supabase.from('profiles').select('*').limit(1);
console.log('Direct Supabase test:', { data, error });
```

## Success Criteria

✅ **All features work identically with and without backend**
✅ **Clear visual feedback when using fallback**
✅ **Automatic recovery when backend comes back online**
✅ **File uploads work through Supabase Storage**
✅ **Role-based permissions are maintained**
✅ **No data loss or inconsistency**

## Notes
- The fallback system uses the same Supabase database as the backend
- File uploads go to the same storage bucket
- All security policies (RLS) are maintained
- User sessions are handled consistently
