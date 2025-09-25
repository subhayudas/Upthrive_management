# Backend Fallback System Setup

This document explains how to set up and use the backend fallback system that allows your frontend to work even when the deployed backend is unavailable.

## Overview

The fallback system automatically detects when the backend is down and switches to direct Supabase calls, ensuring all features remain functional. Users will see visual indicators when the fallback is active.

## Setup Instructions

### 1. Environment Variables

Copy the environment variables from the client's `.env.example` file:

```bash
cd client
cp .env.example .env
```

Edit the `.env` file and add your Supabase credentials:

```bash
# Backend API URL (for development)
REACT_APP_API_URL=http://localhost:5000

# Supabase Configuration (for fallback when backend is unavailable)
REACT_APP_SUPABASE_URL=your-supabase-project-url
REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 2. Find Your Supabase Credentials

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to Settings > API
4. Copy the Project URL and anon public key:
   - `REACT_APP_SUPABASE_URL` = Project URL
   - `REACT_APP_SUPABASE_ANON_KEY` = anon public key

### 3. Test the Fallback System

#### Option 1: Stop the Backend Server
1. Stop your backend server
2. Open the frontend application
3. Try using any feature (login, create requests, etc.)
4. You should see toast messages indicating "Using direct connection"

#### Option 2: Change Backend URL
1. Temporarily change `REACT_APP_API_URL` to a non-existent URL
2. Restart the frontend
3. Test the application functionality

## How It Works

### Automatic Detection
- The system monitors backend responses
- Network errors, connection failures, or 5xx errors trigger fallback mode
- Once in fallback mode, all subsequent requests use Supabase directly

### Visual Feedback
- Success messages include "(Using direct connection)" when using fallback
- Console logs show "✅ [Feature] loaded using Supabase fallback"
- All functionality remains identical to backend mode

### Supported Features

All major features work with the fallback system:

✅ **Authentication**
- Login/Logout
- Registration  
- Profile management

✅ **Requests Management**
- Create requests with file uploads
- View requests (filtered by user role)
- Assign requests to editors
- Submit completed work
- Manager review (approve/reject)
- Client review (approve/reject)

✅ **Content Calendar (CC List)**
- View CC items
- Create CC items with media
- Edit CC items
- Delete CC items (role-based permissions)

✅ **User Management**
- Get users/clients/editors
- Update user profiles

✅ **Dashboard & Calendar**
- Dashboard statistics
- Calendar view with scheduled items

### File Uploads
- File uploads work through Supabase Storage
- Same bucket (`request-files`) used as backend
- Maintains file URLs and media arrays

### Permissions & Security
- All Row Level Security (RLS) policies are respected
- User authentication is maintained
- Role-based access control works identically

## Troubleshooting

### Common Issues

1. **"Supabase not configured" error**
   - Check your `.env` file has the correct Supabase credentials
   - Restart the development server after adding environment variables

2. **Authentication not working**
   - Verify the Supabase project URL and anon key
   - Check that RLS policies are set up correctly in Supabase

3. **File uploads failing**
   - Ensure the `request-files` bucket exists in Supabase Storage
   - Check bucket permissions allow authenticated uploads

4. **Features not working as expected**
   - Check the browser console for error messages
   - Verify the database schema matches the backend expectations

### Backend Recovery

When the backend comes back online:
1. The system automatically detects working backend responses
2. New requests will use the backend again
3. No manual intervention required
4. Data remains consistent as both use the same Supabase database

## Development Tips

### Testing Both Modes
1. Use environment variables to easily switch between modes
2. Test critical user flows in both backend and fallback modes
3. Verify file uploads work in both scenarios

### Monitoring
- Watch browser console for fallback activation logs
- Monitor toast notifications for user feedback
- Check network tab to see which endpoints are being called

### Adding New Features
When adding new API calls:
1. Add the backend call function
2. Add the equivalent Supabase call function  
3. Use `apiService.makeRequest()` to get automatic fallback
4. Test both code paths

## Security Considerations

- The anon key is safe to expose in frontend code
- RLS policies prevent unauthorized data access
- File uploads go to the same secure Supabase bucket
- User sessions are managed consistently

## Production Deployment

1. Set environment variables in your hosting platform:
   - Vercel: Project Settings > Environment Variables
   - Netlify: Site Settings > Environment Variables
   - Railway: Variables tab

2. Ensure both backend and Supabase are properly configured

3. Test the fallback by temporarily taking the backend offline

The fallback system provides a robust solution for maintaining application availability even when the backend service experiences issues.
