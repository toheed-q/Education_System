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