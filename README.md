# 🏠 RoomSetu — Find Your Space, Find the Right Place

\<p align="center">
&#x20; \<strong>A Smart Room Discovery Platform\</strong>
\</p>

\<p align="center">
&#x20; Connecting Room Owners and Room Seekers through a simple, secure and user-friendly digital platform.
\</p>

---

## 🌐 Live Project

| Service        | Platform      | Link                                                                     |
| -------------- | ------------- | ------------------------------------------------------------------------ |
| Frontend       | Vercel        | [https://roomsetu-six.vercel.app](https://roomsetu-six.vercel.app)       |
| Backend API    | Render        | [https://roomsetu-0bwo.onrender.com](https://roomsetu-0bwo.onrender.com) |
| Database       | MongoDB Atlas | MongoDB Cloud                                                            |
| Project Domain | Custom Domain | [https://roomsetu.co.in](https://roomsetu.co.in)                         |

---

## 📌 1. About RoomSetu

**RoomSetu** is a web-based room discovery platform designed to connect room owners with people searching for accommodation.

Finding a suitable room in a new city can be difficult. People often depend on brokers, social media groups, local contacts and multiple websites to find available rooms.

RoomSetu solves this problem by providing a centralized platform where room owners can publish their room listings and seekers can discover suitable accommodation.

Initially focused on **Nainital, Uttarakhand**, RoomSetu aims to expand to other cities across India.

The word RoomSetu represents a digital bridge between Room Owners and Room Seekers.

### 🎯 Our Mission

To make room discovery easier, faster, more transparent and accessible through technology.

---

## ❗ 2. Problem Statement

Finding rental accommodation is often a time-consuming process.

Some common problems include:

- Lack of centralized room listing platforms.
- Difficulty finding available rooms in specific locations.
- Incomplete information about rent and facilities.
- Dependence on brokers and local references.
- Difficulty communicating with room owners.
- Lack of a simple platform for owners to manage room listings.

### 💡 Our Solution

RoomSetu provides a centralized digital platform where:

- Room owners can register and publish room details.
- Room seekers can search and filter available rooms.
- Users can view room descriptions, images, rent and location.
- Seekers can directly contact room owners.
- Users can submit feedback and report technical issues.

---

## 🎯 3. Project Objectives

1. Build a centralized room discovery platform.
2. Connect room owners directly with room seekers.
3. Provide secure authentication and role-based authorization.
4. Allow owners to create, update and manage room listings.
5. Provide location-based room discovery and filtering.
6. Build a responsive interface for desktop, tablet and mobile.
7. Support Light Mode and Dark Mode.
8. Provide a secure feedback and issue-reporting system.
9. Build a scalable architecture for future expansion.

---

## ✨ 4. Key Features

### 👤 A. Room Seeker

- User Registration and Login.
- Browse available room listings.
- Search rooms by location.
- Filter rooms according to different criteria.
- View complete room details.
- View room images, rent and facilities.
- Check room availability.
- Contact room owners.

### 🏡 B. Room Owner

- Owner Registration and Login.
- Dedicated Owner Dashboard.
- Add new room listings.
- Upload room images.
- Add room title and description.
- Set monthly rent.
- Select room type.
- Add location details.
- Manage existing room listings.
- Edit room information.
- Update room availability.
- Delete listings using soft delete.

### 🌙 C. User Interface

- Responsive design.
- Light and Dark Mode.
- Reusable React components.
- Consistent branding and official RoomSetu logo.
- Clean navigation and user-friendly layout.
- Accessible interactive components.

### 💬 D. Feedback & Report Issue System

- Submit suggestions and feedback.
- Report bugs and technical issues.
- Guest feedback submission.
- Authenticated user feedback submission.
- Automatic user information prefilling for logged-in users.
- Input validation using Zod.
- Feedback stored in MongoDB.
- Feedback email notifications through Nodemailer when SMTP is configured.

---

## 🛠️ 5. Technology Stack

### Frontend

| Technology      | Purpose                             |
| --------------- | ----------------------------------- |
| React.js        | Building user interfaces            |
| Vite            | Frontend development and build tool |
| TypeScript      | Type safety                         |
| Tailwind CSS    | Styling and responsive UI           |
| React Router    | Client-side navigation              |
| React Hook Form | Form management                     |
| Zod             | Form validation                     |

### Backend

| Technology    | Purpose                       |
| ------------- | ----------------------------- |
| Node.js       | JavaScript runtime            |
| Express.js    | Backend API development       |
| TypeScript    | Type-safe backend development |
| MongoDB       | Database                      |
| MongoDB Atlas | Cloud database hosting        |
| Mongoose      | Database modeling             |
| JWT           | Authentication                |
| Zod           | Request validation            |
| Nodemailer    | Email notifications           |
| bcrypt        | Secure password hashing       |

### Development & Deployment Tools

| Tool          | Purpose                |
| ------------- | ---------------------- |
| VS Code       | Code editor            |
| Git           | Version control        |
| GitHub        | Source code management |
| Postman       | API testing            |
| Vercel        | Frontend deployment    |
| Render        | Backend deployment     |
| MongoDB Atlas | Cloud database hosting |

---

## 🏗️ 6. System Architecture

RoomSetu follows a frontend-backend-database architecture.

### Application Flow

```text
       USER
         |
         v
  REACT FRONTEND
    (Vercel)
         |
         | HTTP Requests
         v
  EXPRESS BACKEND API
      (Render)
         |
         | Mongoose
         v
    MONGODB ATLAS
         |
         v
    DATABASE
```

### Architecture Explanation

**1. Frontend — React + Vite + TypeScript**

The frontend provides the user interface, room discovery experience, dashboards, authentication screens and feedback forms.

**2. Backend — Node.js + Express**

The backend handles authentication, authorization, room management, feedback processing and business logic.

**3. Database — MongoDB Atlas**

MongoDB stores user information, room listings, feedback and related application data.

**4. Email Service — Nodemailer**

The backend sends email notifications when a new feedback submission is successfully stored and SMTP is configured.

---

## 🔐 7. Authentication & Security

RoomSetu implements secure authentication and authorization.

### Authentication Features

- JWT-based access authentication.
- HTTP-only refresh token cookies.
- Secure password hashing.
- Role-based access control.
- Protected API routes.
- Refresh session management.
- Ownership verification for room operations.

### Security Implementation

- Passwords are securely hashed before storage.
- Refresh tokens are stored as hashes in the database.
- Protected endpoints require authentication.
- Owner-only operations require the owner role.
- Room owners can modify only their own listings.
- Request data is validated using Zod.
- Sensitive environment variables are not exposed to the frontend.

---

## 🏠 8. Room Management System

RoomSetu provides complete room listing management functionality.

### Room Data Model

Each room listing includes:

| Field         | Description                   |
| ------------- | ----------------------------- |
| ownerId       | Room owner's reference        |
| title         | Room title                    |
| description   | Room description              |
| rent          | Monthly rent                  |
| location      | Country, state, city and area |
| roomType      | Single, Double or PG          |
| images        | Room image collection         |
| facilities    | Available facilities          |
| suitableFor   | Suitable tenant categories    |
| contactNumber | Owner's contact number        |
| availability  | Available or Booked           |
| isDeleted     | Soft delete status            |

### Room Management Operations

- Create Room
- Fetch All Rooms
- Fetch My Rooms
- Fetch Room by ID
- Update Room
- Delete Room
- Update Room Availability

Deleted listings use soft deletion rather than immediate permanent database removal.

---

## 🔌 9. Backend API Endpoints

Base URL:

`https://roomsetu-0bwo.onrender.com/api/v1`

### Authentication APIs

Authentication supports user registration, login, token refresh, logout and session management.

Refer to the backend route files for the exact authentication endpoint definitions.

### Room APIs

| Method | Endpoint                  | Description         |
| ------ | ------------------------- | ------------------- |
| POST   | `/rooms`                  | Create a room       |
| GET    | `/rooms`                  | Fetch room listings |
| GET    | `/rooms/my`               | Fetch owner's rooms |
| GET    | `/rooms/:id`              | Fetch room details  |
| PATCH  | `/rooms/:id`              | Update room         |
| DELETE | `/rooms/:id`              | Soft delete room    |
| PATCH  | `/rooms/:id/availability` | Update availability |

### Feedback API

| Method | Endpoint    | Description                        |
| ------ | ----------- | ---------------------------------- |
| POST   | `/feedback` | Submit feedback or report an issue |

### Feedback Security

- Supports guest and authenticated submissions.
- Invalid supplied Bearer tokens return `401 Unauthorized`.
- User ID is derived from the verified JWT.
- Client-supplied user IDs are not trusted.
- Feedback status is assigned server-side as `Pending`.
- Invalid input is rejected through validation.

---

## 💬 10. Feedback & Email Notification System

The Feedback System was implemented to allow users to communicate suggestions, problems and technical issues.

### Frontend

File:

`frontend/src/features/feedback/FeedbackModal.tsx`

Features:

- Reusable feedback modal.
- React Hook Form integration.
- Zod validation.
- Accessible dialog.
- Loading and success states.
- Escape key support.
- Responsive design.
- Dark Mode compatibility.
- Automatic name and email prefilling for authenticated users.

The same modal is used for two actions:

| Action          | Default Feedback Type |
| --------------- | --------------------- |
| Give Feedback   | Suggestion            |
| Report an Issue | Bug / Error           |

### Backend

Endpoint:

`POST /api/v1/feedback`

Feedback is validated and stored in MongoDB with a default status of `Pending`.

### Email Notifications

RoomSetu uses Nodemailer with SMTP to send feedback notifications to the configured receiver email.

Email notifications are triggered after successful database persistence.

**Important:** SMTP configuration is optional. Actual email delivery requires manual configuration of Gmail App Password credentials in the backend environment.

Without SMTP configuration, feedback is still saved successfully and the API returns its normal success response.

---

## 🗄️ 11. Database Design

RoomSetu uses MongoDB Atlas as its cloud database.

### Main Database Components

- User information
- Refresh sessions
- Room listings
- Feedback records

### Room Database Indexes

Indexes are configured for:

- `ownerId`
- `location.city`
- `location.area`
- `availability`
- `isDeleted`
- `createdAt`

### Feedback Database

Feedback model contains:

- `userId` — Optional user reference.
- `name` — Submitter name.
- `email` — Submitter email.
- `type` — Feedback category.
- `message` — Feedback content.
- `status` — Feedback status.

Indexes are configured for `userId`, `status` and `createdAt`.

---

## 📂 12. Project Structure

The project is organized into separate frontend and backend applications.

```text
RoomSetu/
│
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   │   └── logo.png
│   │   │
│   │   ├── components/
│   │   │   └── Footer.tsx
│   │   │
│   │   ├── features/
│   │   │   └── feedback/
│   │   │       └── FeedbackModal.tsx
│   │   │
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   ├── SeekerHome.tsx
│   │   │   ├── OwnerHome.tsx
│   │   │   └── RoomDetails.tsx
│   │   │
│   │   └── ...
│   │
│   ├── package.json
│   └── ...
│
├── Backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── env.ts
│   │   │
│   │   ├── modules/
│   │   │   └── feedback/
│   │   │       └── feedback.controller.ts
│   │   │
│   │   ├── services/
│   │   │   └── email.service.ts
│   │   │
│   │   └── tests/
│   │       └── feedback.test.ts
│   │
│   ├── .env.example
│   ├── package.json
│   └── ...
│
└── README.md
```

*Note: This is a representative structure showing important files. Refer to the repository for the complete directory structure.*

---

## ⚙️ 13. Installation & Setup

Follow these steps to run RoomSetu locally.

### Prerequisites

Install the following:

- Node.js
- npm
- Git
- MongoDB Atlas account
- VS Code (recommended)

### Step 1: Clone Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
```

```bash
cd RoomSetu
```

### Step 2: Setup Frontend

```bash
cd frontend
npm install
```

Create the frontend environment file using the environment variable names defined in the frontend configuration and `.env.example`, if available.

Start the frontend:

```bash
npm run dev
```

### Step 3: Setup Backend

Open another terminal:

```bash
cd Backend
npm install
```

Create a `.env` file using the backend `.env.example` as a reference.

Configure the MongoDB connection and required authentication secrets.

Start the backend using the scripts defined in `Backend/package.json`.

### Step 4: MongoDB Configuration

1. Create a MongoDB Atlas account.
2. Create a database.
3. Configure the database connection string.
4. Add the connection string to the backend environment.
5. Start the backend server.

### Step 5: Access Application

Open the local frontend URL provided by Vite in your browser.

---

## 🔑 14. Environment Variables

Never upload your actual `.env` files, API secrets, JWT secrets, database credentials or email passwords to GitHub.

### Backend SMTP Configuration

The following optional variables are used for feedback email notifications:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-16-character-app-password
FEEDBACK_RECEIVER_EMAIL=your-receiver-email@gmail.com
```

For Gmail, use an App Password rather than your normal Gmail password.

Other backend environment variables and frontend API configuration should be taken directly from the respective `.env.example` files.

**Security:** Keep all production secrets inside Vercel and Render environment-variable settings.

---

## 🚀 15. Deployment

RoomSetu uses separate hosting services for the frontend, backend and database.

### Frontend Deployment — Vercel

The React + Vite frontend is deployed on Vercel.

Live URL:

[https://roomsetu-six.vercel.app](https://roomsetu-six.vercel.app)

Vercel provides frontend hosting and production builds.

### Backend Deployment — Render

The Node.js + Express backend is deployed on Render.

API Base URL:

[https://roomsetu-0bwo.onrender.com](https://roomsetu-0bwo.onrender.com)

Render handles backend API requests and server-side operations.

### Database Hosting — MongoDB Atlas

MongoDB Atlas provides cloud database hosting.

It stores application data, including users, rooms, sessions and feedback.

### Deployment Architecture

```text
        USER
          |
          v
  VERCEL FRONTEND
          |
          v
    RENDER BACKEND
          |
          v
    MONGODB ATLAS
```

### Custom Domain

Project Domain:

[https://roomsetu.co.in](https://roomsetu.co.in)

---

## 🧪 16. Testing & Quality Assurance

RoomSetu includes frontend and backend verification through TypeScript checks, production builds, linting and automated tests.

### Frontend Verification

| Test                 | Result                  |
| -------------------- | ----------------------- |
| TypeScript Typecheck | Passed                  |
| Production Build     | Passed                  |
| ESLint               | 0 errors                |
| Existing Warnings    | 6 pre-existing warnings |

### Backend Verification

| Test                 | Result            |
| -------------------- | ----------------- |
| TypeScript Typecheck | Passed            |
| Production Build     | Passed            |
| Automated Tests      | 34 Passed         |
| Skipped Tests        | 11                |
| Failed Tests         | 0                 |
| npm Audit            | 0 vulnerabilities |

### Feedback System Testing

Tests cover:

- Invalid email validation.
- Missing feedback message.
- Invalid feedback types.
- Expired token handling.
- Guest feedback submission.
- Authenticated feedback submission.
- User ID spoofing protection.
- Status protection.
- Email notification failure handling.
- SMTP credential safety.

---

## 🔒 17. Security & Data Protection

Security is an important part of RoomSetu.

Implemented security measures include:

- JWT-based authentication.
- HTTP-only refresh cookies.
- Secure password hashing.
- Role-based authorization.
- Room ownership verification.
- Zod request validation.
- Server-side user ID verification.
- Server-side feedback status assignment.
- Email header injection prevention.
- Environment-based SMTP credentials.
- Internal database errors are not exposed to clients.

---

## 🔮 18. Future Scope

RoomSetu can be expanded with additional features in future development phases.

Potential improvements include:

1. Online booking and room reservation.
2. Advanced location-based search.
3. Interactive maps and navigation.
4. Owner and seeker chat system.
5. Room reviews and ratings.
6. Favorite rooms and saved listings.
7. Admin dashboard and moderation.
8. Push notifications.
9. AI-powered room recommendations.
10. Expansion to multiple cities across India.
11. Mobile application development.
12. Analytics and room listing insights.

---

## 👨‍💻 19. Developer

**Developed by: Himanshu Singh Bisht**

Project: RoomSetu

Role: Full Stack Web Development

Focus Areas:

- Frontend Development
- Backend Development
- REST API Development
- Database Management
- Authentication & Security
- Deployment and Integration

---

## 📜 20. Project Status

RoomSetu is under active development.

The Phase 14 implementation includes:

- Reusable Footer Component.
- Feedback Form and Modal.
- Feedback Backend API.
- MongoDB Feedback Storage.
- Nodemailer Email Notification Integration.
- Security and Validation.
- Automated Testing.

**Phase 14: Completed**

**Phase 15: Not Started**

Email notification integration is implemented, but live SMTP credential configuration is still pending.

---

## ❤️ 21. Acknowledgement

RoomSetu is developed with the goal of making room discovery simpler and more accessible.

The project represents an effort to use modern web technologies to solve a real-world accommodation problem, starting with Nainital and aiming for wider expansion.

**RoomSetu — Find Your Space. Find the Right Room at the Right Place.**

---

\<p align="center">   Made with ❤️ for RoomSetu \</p>
