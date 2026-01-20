# LernenTech E-Learning Platform

## Overview

LernenTech is a full-stack e-learning platform built with React, Express, and PostgreSQL. The application provides course management, tutor booking, and certification features for students and tutors. Key functionality includes:

- **Course System**: Programs containing multiple courses with weekly content, quizzes, and certifications
- **Tutor Marketplace**: Students can find verified tutors, book sessions, and exchange messages
- **Authentication**: Session-based auth with Passport.js using email/password (Argon2 hashing)
- **Role-Based Access**: Supports super_admin, admin, student, and tutor roles

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, built using Vite
- **Routing**: Wouter for client-side routing (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state, local React state for UI
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Animations**: Framer Motion for page transitions and UI effects
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Pattern**: RESTful endpoints defined in `shared/routes.ts` with Zod schemas for validation
- **Session Management**: express-session with connect-pg-simple for PostgreSQL session storage
- **Authentication**: Passport.js with Local Strategy, passwords hashed with Argon2

### Database Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` - defines all tables using pgTable
- **Migrations**: Drizzle Kit with `db:push` command for schema synchronization
- **Connection**: Uses DATABASE_URL environment variable

### Key Database Tables
- `users` - User accounts with role-based access (student, tutor, admin, super_admin)
- `programs` / `courses` - Learning content hierarchy
- `courseWeeks` / `courseContent` - Weekly structured content with video, reading, file, link types
- `quizzes` / `quizQuestions` / `quizAttempts` - Assessment system
- `tutorProfiles` - Tutor information with verification status
- `bookings` - Session scheduling between students and tutors
- `enrollments` / `certificates` - Student progress tracking

### Build System
- **Development**: Vite dev server with HMR, proxied through Express
- **Production**: esbuild bundles server code, Vite builds client to `dist/public`
- **Build Script**: Custom `script/build.ts` handles full production build

## External Dependencies

### Database
- **PostgreSQL**: Primary database via DATABASE_URL environment variable
- **Session Store**: connect-pg-simple stores sessions in PostgreSQL

### Authentication
- **Passport.js**: Authentication middleware with Local Strategy
- **Argon2**: Password hashing algorithm

### Payment Processing
- **Stripe**: Payment integration (dependency present, implementation may be partial)

### API Integrations (Dependencies Present)
- **OpenAI**: AI capabilities
- **Google Generative AI**: Gemini AI integration
- **Nodemailer**: Email sending functionality

### Frontend Libraries
- **shadcn/ui**: Complete component library built on Radix UI primitives
- **Recharts**: Chart/visualization components
- **Embla Carousel**: Carousel functionality
- **react-day-picker**: Calendar/date selection

## Recent Changes (January 2026)

### Course System Implementation
- **Course Details Page** (`CourseDetails.tsx`): Displays course curriculum with week accordions, content list, and quiz links
- **Week Gating**: Weeks unlock progressively - Week N requires passing Week N-1 quiz (70% pass rate)
- **Content Types**: Supports video, reading, file, and link content types with appropriate icons
- **Quiz Flow** (`Quiz.tsx`): Full quiz taking experience with question display, answer selection, submission, and pass/fail results

### Tutor Marketplace Implementation  
- **Tutor Profile Page** (`TutorProfile.tsx`): Complete tutor profile with bio, subjects, hourly rate, and reviews
- **Booking Modal**: Date/time selection for session booking with KES pricing
- **Booking API**: POST /api/bookings creates sessions with student from session, tutor, time range, and price

### Programs Page
- **Programs List** (`Programs.tsx`): Displays available learning programs with exact course counts and enrollment options
- **Program Details** (`ProgramDetails.tsx`): Shows program information with list of included courses

### Course Access Control
- **Enrollment-Based Gating**: Course content is restricted to enrolled users only
- **Preview Mode**: Non-enrolled users see course overview, curriculum structure with week titles, but no detailed content (contentUrl/contentText withheld)
- **Backend Authorization**: `isUserEnrolledInCourse` method checks both direct course enrollment and program enrollment
- **Enrollment Table**: Supports both individual course and program-wide enrollment

### API Endpoints Added
- `GET /api/courses/:id/progress` - Returns week unlock status based on quiz completion
- `POST /api/quizzes/:id/submit` - Submit quiz answers and calculate score
- Booking schema updated to coerce ISO date strings to Date objects

### Test Accounts (password: password123)
- `student@lernentech.com` - Student role
- `tutor@lernentech.com` - Tutor role
- `admin@lernentech.com` - Admin role
- `esthernjane@gmail.com` - Super admin

### Currency
All monetary values are in KES (Kenyan Shillings) stored as integers.