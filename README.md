# SyncTask - Collaborative Project & Task Management System

SyncTask is a premium, full-stack collaborative project and task management system designed to streamline team collaboration. It features a universal mobile app built with Expo and React Native, supported by a robust Node.js/Express REST API with MongoDB and real-time Socket.io syncing.

---

## 🚀 Key Features

### 📋 Core Capabilities
* **Workspaces & Collaboration**: Create multi-user workspaces. Promote/demote members to administrators, invite teammates, or leave workspaces.
* **Project Boards**: Group project-specific pipelines. Set custom visual themes/colors and sync workspace members.
* **Kanban Task Boards**: Scroll horizontally across task columns. Manage tasks with checklist progress bars, labels, and assignee profile bubbles.
* **Cloudinary File Attachments**: Upload photos, documents, and PDFs directly from your phone's library to Cloudinary.
* **Alerts Feed (Notifications)**: Clean alert feed displaying relative dates (e.g. "Today, 10:45 AM"), category filters, read/unread indicators, and instant redirection links.
* **Customizable Profile**: Edit personal credentials, select accent theme colors, and manage sessions from a unified settings screen.

### 👥 Advanced Collaboration & Multi-Layout Workspace
* **Six Board Layout Switcher**:
  1. **Kanban Board**: Drag-and-drop tasks across status columns.
  2. **📅 Calendar View**: View tasks plotted on a daily, weekly, or monthly calendar based on due dates.
  3. **📊 Timeline / Gantt Chart View**: Visualize project schedules, durations, and task dependencies on a timeline.
  4. **👥 Team Workload View**: See assigned tasks per member and highlight overloaded teammates (e.g. >5 tasks or >40 hours). Includes members task search filter.
  5. **📋 Bulk Actions**: Select multiple tasks to status-update, reassign, archive, or delete together.
  6. **🗑️ Trash Bin & Undo**: Restore deleted items (projects & tasks) within a 30-day grace period; includes a brief "Undo" action banner upon deletion.
* **📌 Pinned Items / Favourites**: Star/pin projects and tasks from their detail views to have them appear in a dedicated "Pinned Items" panel on your Home dashboard for easy access.
* **🏁 Project Milestones**: Define project-specific milestones, track progress, toggle completion, and link them to tasks to measure project health.
* **💬 Comments, Mentions & Reactions**: Add comments on tasks with rich-text markdown support. Mention users with `@username` to trigger real-time notification alerts, and add emoji reactions to comments.
* **⏱️ Time Tracking**: Log estimated hours vs. actual hours spent on each task. Features a dynamic progress bar (green if on track, red if actual exceeds estimate) and log tables.
* **📱 Offline Mode & Cache Sync**: Work without internet. All reads fall back to local AsyncStorage. Mutating actions are queued locally and automatically replayed and synchronized when connectivity is restored.
* **⚡ Optimistic UI Updates**: Kanban columns and tasks update instantly in the UI prior to receiving server confirmation for a buttery-smooth experience.
* **📤 Export/Import Tasks**: Export active project boards to CSV files, or import tasks directly by pasting raw CSV strings.
* **🔒 Viewer Restrictions**: Restricts view-only `"viewer"` accounts from performing mutating operations (buttons are automatically hidden from the UI on frontend and blocked on the backend).

### 🎨 Premium Customization & Personal Analytics
* **🌙 Light & Dark Theme Toggle**: Global theme context switching instantly adapts colors across all screens (Home, Projects, Tasks, Alerts, Profile).
* **👤 Avatar Upload (Cloudinary)**: Tap your profile avatar to choose a photo from the gallery, upload to Cloudinary, and display it as your user icon.
* **📂 Custom Task Status Columns**: Configure custom project status columns (e.g. *Review*, *Testing*, *Blocked*) and custom palette colors inside Project Settings.
* **📝 Custom Task Fields**: Declare dynamic user-defined fields (Text, Number, Date, Boolean) per project (e.g., Story Points, Cost, Sprint) to view and edit inside the Task Details modal.
* **📋 Saved Filter Presets**: Save your current search query configurations as reusable filter presets (e.g. "My High Priority Tasks") to select and apply instantly from the Filter Panel.
* **📊 Personal & Workspace Analytics**: Toggle the Home tab statistics widget between Workspace Stats (Total Tasks, In-progress, Overdue, Project breakdown, User productivity list) and your Personal Analytics (active assignments, overdue count, task completion rates, weekly velocity).
* **✨ Auto-Seeded Demo Workspaces**: If a user logs in/registers and has no workspaces (0 workspaces), the backend automatically seeds two complete demo workspaces (**🚀 Apollo Space Project** and **💻 Acme Software Co.**) populated with mock projects, custom columns, custom fields, milestones, tasks, and time logs.

---

## 🛠 Tech Stack

### Frontend (Mobile Client)
* **Framework**: Expo (SDK 56) with Expo Router (File-based Routing)
* **Styling**: NativeWind (Tailwind CSS) & Custom Theme-driven CSS
* **Icons**: `@expo/vector-icons` (Ionicons) & Lucide icons
* **State**: React Context API (`AppContext`)
* **Storage**: `expo-secure-store` & `@react-native-async-storage/async-storage`
* **HTTP Client**: Axios with automatic request token interceptors
* **Offline Manager**: Custom offline task queue (`offlineManager.ts`)

### Backend (API Server)
* **Server**: Node.js & Express with TypeScript
* **Database**: MongoDB (Mongoose Object Modeling)
* **Authentication**: JSON Web Tokens (JWT) & bcrypt passwords
* **Real-Time Syncing**: Socket.io
* **File Uploads**: Multer with Cloudinary Cloud Storage
* **Development Tooling**: ts-node, ts-node-dev, nodemon
* **Background Scheduler**: Custom 60s checker (`scheduler.ts`) for recurring tasks and deadline reminders.

---

## 📂 Project Structure

```text
task-project-management/
├── BACKEND/                    # Node.js Express server codebase
│   ├── src/
│   │   ├── config/             # DB & Cloudinary configurations
│   │   ├── controllers/        # Express request controllers (handles endpoints)
│   │   │   ├── activity.controller.ts
│   │   │   ├── analytics.controller.ts
│   │   │   ├── comment.controller.ts
│   │   │   ├── milestone.controller.ts
│   │   │   ├── notification.controller.ts
│   │   │   ├── project.controller.ts
│   │   │   ├── searchUser.controller.ts
│   │   │   ├── task.controller.ts
│   │   │   ├── upload.controller.ts
│   │   │   ├── user.controller.ts
│   │   │   └── workspace.controller.ts
│   │   ├── middleware/         # Auth, Upload, and Role checking validation
│   │   ├── model/              # Mongoose database schemas (MongoDB collections)
│   │   │   ├── activity.model.ts
│   │   │   ├── comment.model.ts
│   │   │   ├── milestone.model.ts
│   │   │   ├── notification.model.ts
│   │   │   ├── project.model.ts
│   │   │   ├── task.model.ts
│   │   │   ├── user.model.ts
│   │   │   └── workspace.model.ts
│   │   ├── routes/             # REST route handlers
│   │   ├── services/           # Business logic, seeder services, and DB helpers
│   │   │   ├── activity.service.ts
│   │   │   ├── comment.service.ts
│   │   │   ├── demo.service.ts         # Seeds demo workspaces
│   │   │   ├── mention.service.ts      # Parses @mentions in tasks/comments
│   │   │   ├── notification.service.ts
│   │   │   ├── project.service.ts
│   │   │   ├── scheduler.ts            # Crons for reminders & recurring tasks
│   │   │   ├── searchUser.service.ts
│   │   │   ├── socket.ts               # Socket.io notification dispatcher
│   │   │   ├── task.service.ts
│   │   │   ├── user.service.ts
│   │   │   └── workspace.service.ts
│   │   ├── app.ts              # Express app setup
│   │   ├── server.ts           # Server start script & Socket.io setup
│   │   └── seed-dry-run.ts     # Verification dry-run script
│   ├── package.json
│   └── tsconfig.json
│
└── FRONTED/                    # Expo React Native mobile client
    ├── src/
    │   ├── api/                # Axios API communication services
    │   │   ├── auth.api.ts
    │   │   ├── comment.api.ts
    │   │   ├── project.api.ts
    │   │   ├── task.api.ts
    │   │   └── user.api.ts
    │   ├── app/                # Expo Router page layouts and screens
    │   │   ├── (auth)/         # Login & Register views
    │   │   ├── (tabs)/         # Bottom Tab screens:
    │   │   │   ├── home.tsx            # Dashboard, Pinned Items, Analytics
    │   │   │   ├── projects.tsx        # Project List & Cover settings
    │   │   │   ├── tasks.tsx           # Tasks view: 6 layouts switcher
    │   │   │   ├── notifications.tsx   # Notifications feed
    │   │   │   ├── profile.tsx         # User Profile & preferences
    │   │   │   ├── createWorkspace.tsx # Workspace Wizard
    │   │   │   └── _layout.tsx         # Tab bar router shell
    │   │   ├── index.tsx       # Landing splash router guard
    │   │   └── _layout.tsx     # Root Router shell and Context wraps
    │   ├── context/            # Context API provider (AppContext)
    │   ├── utils/              # Utilities
    │   │   └── offlineManager.ts # Offline synchronization queue
    │   └── global.css          # Tailwind Global styling
    ├── package.json
    └── tsconfig.json
```

---

## 📡 REST API Documentation

### 👤 Authentication & User Routes (`/api/users`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/new/register` | Register a new user | No |
| `POST` | `/login` | Log in and get JWT token | No |
| `POST` | `/update` | Update user profile details | Yes |
| `GET` | `/forget-password` | Request password reset | No |
| `GET` | `/profile` | Get logged-in user profile details | Yes |
| `PUT` | `/preferences` | Update email/app notification settings | Yes |
| `POST` | `/logout` | Log out and destroy session | Yes |
| `POST` | `/pin-project/:projectId` | Toggle pinning of a project | Yes |
| `POST` | `/pin-task/:taskId` | Toggle pinning of a task | Yes |
| `GET` | `/pinned` | Retrieve lists of pinned projects & tasks | Yes |
| `PUT` | `/profile/avatar` | Upload and update user avatar | Yes (Multer) |
| `POST` | `/saved-filters` | Save project filter query presets | Yes |
| `GET` | `/saved-filters/:projectId` | Fetch saved filter presets for a project | Yes |
| `DELETE` | `/saved-filters/:filterId` | Delete a saved filter preset | Yes |

### 🏢 Workspace Routes (`/api/workspaces`)
| Method | Endpoint | Description | Auth Required | Role Required |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/create` | Create a new Workspace | Yes | - |
| `GET` | `/user/:userId` | Get all Workspaces of a user | Yes | - |
| `GET` | `/:workspaceId` | Get Workspace details & members | Yes | - |
| `PUT` | `/update/:workspaceId` | Update Workspace info | Yes | Admin |
| `PUT` | `/:workspaceId/add-member` | Add user to Workspace | Yes | Admin |
| `PUT` | `/:workspaceId/remove-member`| Remove user from Workspace | Yes | Admin |
| `PUT` | `/:workspaceId/change-role` | Change member role in Workspace | Yes | Admin |
| `PUT` | `/:workspaceId/leave` | Leave a Workspace | Yes | - |
| `DELETE`| `/delete/:workspaceId` | Delete a Workspace | Yes | Admin (Owner) |

### 📁 Project Routes (`/api/projects`)
| Method | Endpoint | Description | Auth Required | Role Required |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/create` | Create a Project | Yes | Non-Viewer |
| `GET` | `/:projectId` | Get Project details | Yes | - |
| `GET` | `/workspace/:workspaceId` | Get all Projects in Workspace | Yes | - |
| `PUT` | `/update/:projectId` | Update Project details (colors, cover) | Yes | Non-Viewer |
| `DELETE`| `/delete/:projectId` | Soft-delete Project (move to trash) | Yes | Admin |
| `PUT` | `/:projectId/add-member` | Add user to Project | Yes | Non-Viewer |
| `PUT` | `/:projectId/remove-member`| Remove user from Project | Yes | Non-Viewer |
| `PUT` | `/:projectId/change-role` | Change member role in Project | Yes | Non-Viewer |
| `GET` | `/members/:projectId` | Get Project members list | Yes | - |
| `GET` | `/trash/workspace/:workspaceId` | List soft-deleted Projects in Workspace | Yes | - |
| `PUT` | `/restore/:projectId` | Restore Project from Trash Bin | Yes | Non-Viewer |
| `DELETE`| `/permanent/:projectId` | Permanently delete Project | Yes | Admin |
| `PUT` | `/:projectId/columns` | Set custom project status columns | Yes | Non-Viewer |
| `PUT` | `/:projectId/custom-fields` | Define custom task fields schema | Yes | Non-Viewer |

### 📋 Task Routes (`/api/tasks`)
| Method | Endpoint | Description | Auth Required | Role Required |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/create` | Create a Task | Yes | Non-Viewer |
| `GET` | `/project/:projectId` | Get active Tasks in Project | Yes | - |
| `GET` | `/project/:projectId/archived` | Get archived Tasks in Project | Yes | - |
| `GET` | `/:taskId` | Get Task by ID | Yes | - |
| `PUT` | `/:taskId` | Update Task (assignees, fields, checklist) | Yes | Non-Viewer |
| `DELETE`| `/:taskId` | Soft-delete Task (move to Trash Bin) | Yes | Non-Viewer |
| `POST` | `/:taskId/time-log` | Log spent time hours | Yes | Non-Viewer |
| `DELETE`| `/:taskId/time-log/:logId` | Remove log entry | Yes | Non-Viewer |
| `POST` | `/bulk-update` | Batch update status, delete, or reassign | Yes | Non-Viewer |
| `GET` | `/trash/list/:projectId` | List soft-deleted Tasks in Project | Yes | - |
| `PUT` | `/:taskId/restore` | Restore Task from Trash Bin | Yes | Non-Viewer |
| `DELETE`| `/:taskId/permanent` | Permanently delete Task | Yes | Non-Viewer |

### 🏁 Milestone Routes (`/api/milestones`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/` | Create a Milestone | Yes |
| `GET` | `/project/:projectId` | Get all Milestones in Project | Yes |
| `PUT` | `/:milestoneId` | Update Milestone details & status | Yes |
| `DELETE`| `/:milestoneId` | Delete a Milestone | Yes |

### 💬 Comment Routes (`/api/comments`)
| Method | Endpoint | Description | Auth Required | Role Required |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/task/:taskId` | Post a Comment (parses `@username` mentions) | Yes | Non-Viewer |
| `GET` | `/task/:taskId` | Retrieve comments of a task | Yes | - |
| `PUT` | `/:commentId` | Update comment text | Yes | Non-Viewer |
| `POST` | `/:commentId/react` | Toggle emoji reaction to a comment | Yes | Non-Viewer |
| `DELETE`| `/:commentId` | Delete a comment | Yes | Non-Viewer |

### 🔍 Search Routes (`/api/search`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/users` | Search system-wide users by query | Yes |
| `GET` | `/workspaces` | Search workspaces | Yes |
| `GET` | `/projects` | Search projects | Yes |
| `GET` | `/tasks` | Search tasks | Yes |
| `GET` | `/global` | Global search across workspaces, projects, tasks | Yes |
| `GET` | `/user/suggestion/:query` | Search user suggestions for mentions | Yes |

### 🔔 Notification Routes (`/api/notifications`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Retrieve all notifications for user | Yes |
| `GET` | `/task-assigned` | Filter: task assigned notifications | Yes |
| `GET` | `/task-updated` | Filter: task updated notifications | Yes |
| `GET` | `/project-added` | Filter: project added notifications | Yes |
| `GET` | `/workspace-invite`| Filter: workspace invites | Yes |
| `GET` | `/comment-added` | Filter: comments added notifications | Yes |
| `POST` | `/create` | Create notification manually | Yes |
| `PUT` | `/:notificationId/read` | Mark a notification as read | Yes |
| `PUT` | `/read-all` | Mark all notifications as read | Yes |

### 📊 Analytics & Activity Routes
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/analytics/workspace/:workspaceId` | Get Workspace metrics & leaderboards | Yes |
| `GET` | `/api/activities/workspace/:workspaceId` | Get workspace activity history log stream | Yes |

---

## ⚙️ Configuration & Environment Variables

Create a `.env` file in each directory containing the following values:

### Backend Configuration (`BACKEND/.env`)
```env
PORT=5137
MONGO_URL=mongodb+srv://<username>:<password>@cluster.mongodb.net/dbname
JWT_SECRET_KEY=your_jwt_secret_key
cloud_name=your_cloudinary_cloud_name
api_key=your_cloudinary_api_key
api_secret=your_cloudinary_api_secret
```

### Frontend Configuration (`FRONTED/.env`)
```env
EXPO_PUBLIC_API_URL=http://localhost:5137
```

---

## 🚀 How to Install & Run Locally

### 1. Run the Backend API
1. Navigate to the backend folder:
   ```bash
   cd BACKEND
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run in development mode (starts TS compiler, dev server, and Socket.io instances):
   ```bash
   npm run dev
   ```

### 2. Run the Verification Dry Run Test Suite
To seed the database with 5 dummy users, workspace, projects, tasks, comments, reactions, attachments, and milestones, and run 13 programmatical logic verification tests, execute the seeder:
```bash
npx ts-node src/seed-dry-run.ts
```

### 3. Run the Frontend Client
1. Navigate to the frontend folder:
   ```bash
   cd ../FRONTED
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the Metro Bundler on web target:
   ```bash
   npm run web
   ```
   *Press `w` to launch in the web browser, `a` for Android Emulator, or `i` for iOS Simulator.*
