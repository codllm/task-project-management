# SyncTask - Collaborative Project & Task Management System
SyncTask is a premium, full-stack collaborative project and task management system. It features a universal mobile app built with Expo and React Native, supported by a robust Node.js/Express REST API with MongoDB and real-time Socket.io syncing.
---
## 🚀 Key Features
- **Workspaces & Collaboration**: Create multi-user workspaces. Promote/demote members to administrators, invite teammates, or leave workspaces.
- **Project Boards**: Group project-specific pipelines. Set custom visual themes/colors and sync workspace members.
- **Kanban Task Boards**: Scroll horizontally across To Do, In Progress, and Completed columns. Manage tasks with:
  - Task priority vertical color bars (Red for High, Amber for Medium, Blue for Low).
  - checklists with visual subtask progress bars.
  - Checklists with visual subtask progress bars.
  - Overlapping member assignee bubbles.
  - Detail view modals with comment sections and checklist toggles.
- **Cloudinary File Attachments**: Upload photos, documents, and PDFs directly from your phone's library to Cloudinary.
- **Alerts Feed (Notifications)**: Clean alert feed displaying relative dates (e.g. "Today, 10:45 AM"), color-coded category cards, unread indicators, and instant redirection links.
- **Customizable Profile**: Edit personal credentials, select accent theme colors, and manage sessions from a unified settings drawer.
---
## 🛠 Tech Stack
### Frontend (Mobile App)
- **Framework**: Expo (SDK 56) with Expo Router (File-based Routing)
- **Styling**: NativeWind (Tailwind CSS) & Custom Vanilla CSS styles
- **Icons**: `@expo/vector-icons` (Feather icon set)
- **State Management**: React Context API (`AppContext`)
- **Storage**: `expo-secure-store` (Tokens & User profile)
- **HTTP Client**: Axios with request interceptors & automatic 401 session expiration handlers
### Backend (REST API & Real-time Server)
- **Server**: Node.js & Express with TypeScript
- **Database**: MongoDB (Mongoose Object Modeling)
- **Authentication**: JSON Web Tokens (JWT)
- **Real-Time Syncing**: Socket.io
- **File Uploads**: Multer with Cloudinary Cloud Storage
- **Logging/Validation**: Express Validator & nodemon dev tooling
---
## 📂 Project Structure
```text
task-project-management/
├── BACKEND/                    # Node.js Express server codebase
│   ├── src/
│   │   ├── config/             # DB & Cloudinary configuration
│   │   ├── controllers/        # Express request controllers
│   │   ├── controllers/        # Express request controllers (handles endpoints)
│   │   ├── middleware/         # Auth, Upload, and Validation middlewares
│   │   ├── model/              # Mongoose database schemas
│   │   ├── model/              # Mongoose database schemas (MongoDB collections)
│   │   ├── routes/             # REST route handlers
│   │   ├── services/           # Business logic & Database helpers
│   │   ├── app.ts              # Express initialization
│   │   └── server.ts           # Server start script
│   │   └── server.ts           # Server start script & Socket.io setup
│   ├── package.json
│   └── tsconfig.json
│
└── FRONTED/                    # Expo React Native mobile client
    ├── src/
    │   ├── api/                # Axios API communication services
    │   ├── app/                # Expo Router page layouts and screens
    │   │   ├── (auth)/         # Login & Signup screens
    │   │   ├── (auth)/         # Login & Signup route wrappers
    │   │   ├── (tabs)/         # Tab screens (Home, Projects, Tasks, Alerts, Profile)
    │   │   └── _layout.tsx     # Root Router stack
    │   ├── context/            # Context API provider
    │   │   ├── auth/           # Actual Login & Registration views
    │   │   ├── _layout.tsx     # Root Router stack and Auth guard
    │   │   └── index.tsx       # Loading Splash redirection screen
    │   ├── context/            # Context API provider (AppContext)
    │   └── global.css          # Tailwind Global styling
    ├── package.json
    └── tsconfig.json
```
---
## 📱 Detailed Frontend Pages & Features
The frontend application uses Expo Router's file-based navigation. Below is a detailed breakdown of each screen and its operational duties:
### 1. Root & Shell Layout
*   **Splash Router Screen (`index.tsx`)**: The app's initial entry point. Displays a clean, branded loading animation while the authentication state is validated.
*   **Root Layout Guard (`_layout.tsx`)**: Uses the `AppContext` state to check for a JWT token in `expo-secure-store`.
    *   **Authenticated**: Redirects the user directly to the workspace homepage (`/(tabs)/home`).
    *   **Unauthenticated**: Routes the user to the login flow (`/(auth)/login`).
*   **Tab Navigation Shell (`(tabs)/_layout.tsx`)**: Configures the bottom tab bar styling, icons, and dynamic badges (such as unread notification counts on the Alerts tab).
### 2. Authentication Flow
*   **Login Screen (`(auth)/login.tsx` -> `auth/loginScreen.jsx`)**:
    *   Collects user credentials (email and password).
    *   Features a validation state, inline error reporting, and secure text toggling.
    *   Authenticates with the backend via `loginApi`. On success, saves the session JWT and user profile, then transitions to the homepage.
*   **Registration Screen (`(auth)/register.tsx` -> `auth/registerScreen.jsx`)**:
    *   Allows new users to create accounts.
    *   Collects: First Name, Last Name, Username, Email, Password, Age, Gender, and Phone Number.
    *   Performs input checking and outputs API validation warnings (e.g., if the email is already in use).
### 3. Workspaces & Dashboard (`(tabs)/home.tsx`)
*   **Workspace Switcher Dropdown**: Allows users to dynamically select and load workspace dashboards they belong to.
*   **Analytics Overview**: Displays the metrics bar showing `Total Tasks`, `Completed Tasks`, and `In Progress Tasks` for the current workspace.
*   **Member Management Dialog**:
    *   Lists all members with details and color-coded avatar initials.
    *   Allows workspace administrators to search for users in the database and add/invite them.
    *   Provides permissions to promote members to Administrators, demote them, or remove them entirely.
    *   Enables regular members to leave the workspace.
    *   Enables the workspace creator/administrator to delete the workspace.
*   **Interactive Profile Sheet**: Tapping on any member displays a modal showing their full profile, email, phone number, gender, and the list of projects they are assigned to within the active workspace.
### 4. Create Workspace (`(tabs)/createWorkspace.tsx`)
*   A clean form screen dedicated to initializing a new workspace. Users input a workspace name and description. Tapping create registers it in MongoDB and automatically switches the user to the newly created workspace.
### 5. Project Board (`(tabs)/projects.tsx`)
*   **Project Lists**: Lists all active projects within the current workspace, styled with their unique color themes.
*   **Project Creator**: Create new projects with custom names, descriptions, and color choices from a premium color palette (Lime, Blue, Purple, Orange, Pink).
*   **Active Project Selector**: Tapping on a project sets it as the active focus project, which dynamically scopes the Kanban board's tasks.
*   **Project Access Management**: Assign specific workspace members to a project, set their project roles (Admin/Member), or remove them from the project.
### 6. Kanban Task Board (`(tabs)/tasks.tsx`)
*   **Horizontal Columns**: Organizes tasks into `To do`, `In progress`, and `Completed` lanes.
*   **Task Card Cards**:
    *   Displays task priority flags (High/Red, Medium/Amber, Low/Blue).
    *   Includes a visual subtask progress bar (computes % of checked checklist items).
    *   Displays overlapping member assignee profile circles.
*   **Create Task Modal**: Quickly create tasks specifying title, description, priority, column status, assignees, start date, and due date.
*   **Task Detail Inspector Modal**:
    *   **Checklists**: Create, toggle, and delete subtasks instantly.
    *   **Cloudinary Attachments**: Upload and view file attachments (images, PDFs, documents) leveraging `expo-image-picker` and `expo-document-picker` connected to Cloudinary.
    *   **Comments Feed**: Add, read, and delete comments. Shows timestamp and author initials.
    *   **Metadata Editor**: Modify the task's status, priority, title, description, dates, or assignees. Contains task deletion capability.
### 7. Alerts Feed (`(tabs)/notifications.tsx`)
*   **Categorized Notifications**: Lists all real-time events, color-coded by category:
    *   💼 `WORKSPACE_INVITE`: Workspace additions.
    *   🚀 `PROJECT_ADDED`: Assignment to new projects.
    *   🎯 `TASK_ASSIGNED`: New task assignments.
    *   ⚡ `TASK_UPDATED`: Status or metadata changes.
    *   💬 `COMMENT_ADDED`: Comments on tasks.
*   **Direct Navigation**: Tapping a notification automatically selects the relevant workspace/project and opens the corresponding task board.
*   **Bulk Management**: Provides actions to mark all notifications as read or clear the log.
### 8. User Profile & Settings (`(tabs)/profile.tsx`)
*   **Dynamic Theme Selection**: Choose a primary color theme (Lime, Blue, Purple, Orange, Pink) which instantly skins the app's interactive elements, headers, and buttons.
*   **Profile Modifiers**: Edit names, age, gender, and phone number.
*   **Session Management**: Displays a list of active devices and authentication tokens registered under the user's account. Users can log out of individual sessions or trigger a universal logout.
---
## 🛠 Tech Stack
### Frontend (Mobile App)
- **Framework**: Expo (SDK 56) with Expo Router (File-based Routing)
- **Styling**: NativeWind (Tailwind CSS) & Custom Vanilla CSS styles
- **Icons**: `@expo/vector-icons` (Feather icon set)
- **State Management**: React Context API (`AppContext`)
- **Storage**: `expo-secure-store` (Tokens & User profile)
- **HTTP Client**: Axios with request interceptors & automatic 401 session expiration handlers
### Backend (REST API & Real-time Server)
- **Server**: Node.js & Express with TypeScript
- **Database**: MongoDB (Mongoose Object Modeling)
- **Authentication**: JSON Web Tokens (JWT)
- **Real-Time Syncing**: Socket.io
- **File Uploads**: Multer with Cloudinary Cloud Storage
- **Logging/Validation**: Express Validator & nodemon dev tooling
---
## ⚙️ Backend API Architecture & Modules
The backend is built with Express and structured into modular controller/route pairs:
### 1. Models & Mongoose Schemas (`BACKEND/src/model/*`)
- **User Schema (`user.model.ts`)**: Manages account credentials, encryption, personal metadata, and active session tokens.
- **Workspace Schema (`workspace.model.ts`)**: Maintains workspace configurations and member roles (Admin/Member).
- **Project Schema (`project.model.ts`)**: Defines projects, associated workspaces, color themes, and member permissions.
- **Task Schema (`task.model.ts`)**: Manages checklist subtasks, Cloudinary file attachment URLs, start/due dates, priority strings, and project associations.
- **Comment Schema (`comment.model.ts`)**: Stores discussion remarks linked to tasks and users.
- **Notification Schema (`notification.model.ts`)**: Stores notification history, statuses, categories, and target redirect routes.
### 2. Controller Handlers (`BACKEND/src/controllers/*`)
- **`user.controller.ts`**: Handles signup, sign-in, profile updates, and session revocation.
- **`workspace.controller.ts`**: Manages workspace life cycle, role adjustments, member searches, invites, and leaving/deletion workflows.
- **`project.controller.ts`**: Manages project setups, workspace associations, and project membership updates.
- **`task.controller.ts`**: Creates tasks, updates task details (statuses, assignees, priorities), and deletes tasks.
- **`comment.controller.ts`**: Registers and removes task discussions.
- **`upload.controller.ts`**: Uploads files to Cloudinary cloud storage via Multer.
- **`notification.controller.ts`**: Handles notification fetching and read state indicators.
- **`analytics.controller.ts`**: Computes aggregated task counts for workspace dashboards.
- **Socket.io Integration (`server.ts`)**: Establishes real-time persistent connections, instantly propagating task movements, member edits, and comments across active connected users.
---
## ⚙️ Configuration & Environment Variables
### Backend Setup
- **Android**: Press `a` to open in Android Studio Emulator.
- **Expo Go App**: Scan the QR code on a physical device.
