# Social Media Agency Management System MVP

A comprehensive web application for managing social media agency workflows with three user roles: Client, Manager, and Editor. Built with Node.js, Express, React, and Supabase.

## 🚀 Features

### Client Features

- ✅ View their own CC (Content Calendar) list
- ✅ Submit social media post requests to managers
- ✅ Upload images with requests
- ✅ Review and approve/decline completed work
- ✅ Track request status and progress

### Manager Features

- ✅ Full CRUD operations on CC lists for all clients
- ✅ View and manage all client requests
- ✅ Assign tasks to editors
- ✅ Review editor submissions and approve/reject
- ✅ Manage user accounts and roles
- ✅ Bulk upload CC list items

### Editor Features

- ✅ View assigned tasks from managers
- ✅ Submit completed work with images and descriptions
- ✅ Track task status and feedback
- ✅ Receive revisions when work is rejected

## 🛠️ Tech Stack

### Backend

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Supabase** - Database and authentication
- **PostgreSQL** - Database (via Supabase)
- **Multer** - File upload handling
- **JWT** - Authentication tokens

### Frontend

- **React** - UI framework
- **React Router** - Client-side routing
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **React Hook Form** - Form handling
- **React Hot Toast** - Notifications
- **Lucide React** - Icons

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account
- Git

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd social-media-agency-mvp
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get your project URL and keys
3. Run the database schema:

```sql
-- Copy and paste the contents of database/schema.sql into your Supabase SQL editor
```

### 3. Environment Setup

#### Backend Environment

Create `server/.env` file:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Secret
JWT_SECRET=your_jwt_secret_key
```

### 4. Install Dependencies

```bash
# Install all dependencies (root, server, and client)
npm run install-all
```

### 5. Start Development Servers

```bash
# Start both backend and frontend
npm run dev

# Or start them separately:
npm run server  # Backend on port 5000
npm run client  # Frontend on port 3000
```

## 📁 Project Structure

```
social-media-agency-mvp/
├── server/                 # Backend API
│   ├── config/            # Configuration files
│   ├── middleware/        # Authentication middleware
│   ├── routes/            # API routes
│   ├── uploads/           # File uploads
│   └── index.js           # Server entry point
├── client/                # Frontend React app
│   ├── public/            # Static files
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── contexts/      # React contexts
│   │   └── App.js         # Main app component
│   └── package.json
├── database/              # Database schema
└── README.md
```

## 🔐 Authentication & Authorization

The system uses Supabase for authentication with role-based access control:

- **Client**: Can only access their own data and submit requests
- **Manager**: Full access to all data and CRUD operations
- **Editor**: Can view assigned tasks and submit work

## 📊 Database Schema

### Core Tables

- `profiles` - User profiles with roles
- `clients` - Client information
- `cc_list` - Content calendar items
- `requests` - Client requests to managers
- `tasks` - Editor assignments and submissions
- `client_reviews` - Client approval tracking

### Key Relationships

- Each client has their own CC list
- Requests flow from Client → Manager → Editor → Manager → Client
- Tasks track the complete workflow with status updates

## 🔄 Workflow

### 1. Client Request Flow

1. Client submits request with message and optional image
2. Manager reviews and assigns to editor
3. Editor completes work and submits
4. Manager reviews and approves/rejects
5. If approved, client reviews and approves/rejects
6. If rejected, task returns to previous step

### 2. CC List Management

- Managers can create, read, update, delete CC items
- Clients can only view their own CC list
- Editors can view all CC lists for reference

## 🎨 UI/UX Features

- **Responsive Design** - Works on desktop, tablet, and mobile
- **Role-based Navigation** - Different menus for different user types
- **Real-time Status Updates** - Visual status badges and progress tracking
- **Image Upload** - Support for multiple image formats
- **Toast Notifications** - User feedback for all actions
- **Loading States** - Smooth user experience during API calls

## 🔧 API Endpoints

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/logout` - User logout

### CC Lists

- `GET /api/cc-list/:clientId` - Get client's CC list
- `POST /api/cc-list/:clientId` - Create CC item (managers only)
- `PUT /api/cc-list/:clientId/:itemId` - Update CC item (managers only)
- `DELETE /api/cc-list/:clientId/:itemId` - Delete CC item (managers only)

### Requests

- `POST /api/requests` - Create request (clients only)
- `GET /api/requests/my-requests` - Get user's requests
- `PUT /api/requests/:requestId/assign` - Assign to editor (managers only)

### Tasks

- `GET /api/tasks/my-tasks` - Get user's tasks
- `PUT /api/tasks/:taskId/submit` - Submit work (editors only)
- `PUT /api/tasks/:taskId/review` - Review submission (managers only)

### Users

- `GET /api/users` - Get all users (managers only)
- `GET /api/users/editors` - Get all editors (managers only)
- `GET /api/users/clients` - Get all clients (managers/editors only)

## 🚀 Deployment

### Backend Deployment

1. Set up environment variables on your hosting platform
2. Install dependencies: `npm install`
3. Start the server: `npm start`

### Frontend Deployment

1. Build the project: `npm run build`
2. Deploy the `build` folder to your hosting platform
3. Update API endpoints for production

### Database

- Supabase handles database hosting and scaling
- No additional database setup required

## 🧪 Testing

```bash
# Run backend tests
cd server && npm test

# Run frontend tests
cd client && npm test
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Check the documentation
- Review the API endpoints

## 🔮 Future Enhancements

- Real-time notifications
- File management system
- Advanced reporting and analytics
- Mobile app
- Integration with social media platforms
- Automated task assignment
- Time tracking
- Invoice generation

---

**Built with ❤️ for social media agencies**
