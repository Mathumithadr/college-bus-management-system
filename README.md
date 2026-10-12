# College Bus Management System

A full-stack web application for managing college bus operations, student assignments, attendance requests, and transport complaints.

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Database:** MongoDB (Mongoose ODM)

## Project Structure

\`\`\`
college_bus_management_system/
├── backend/          # Node.js + Express API
└── frontend/         # React frontend (coming soon)
\`\`\`

## Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB (local) or MongoDB Atlas account
- Git

### Backend Setup

\`\`\`bash
cd backend
npm install
cp .env.example .env
# Edit .env and set JWT_SECRET to a random string
npm run seed     # creates local DB with test data
npm run dev      # starts server on http://localhost:5000
\`\`\`

### Test Credentials (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@college.edu | Admin@123 |
| Staff | staff@college.edu | Staff@123 |
| Student | student@college.edu | Student@123 |
| Representative | rep@college.edu | Rep@123 |

### Frontend Setup

\`\`\`bash
cd frontend
npm install
npm run dev      # starts on http://localhost:5173
\`\`\`

## Environment Variables

Copy `.env.example` to `.env` and fill in values. **Never commit `.env`.**

## Team Workflow

Each developer runs their own local MongoDB. To share data, we'll switch to a MongoDB Atlas cluster.

## License

MIT
\`\`\`