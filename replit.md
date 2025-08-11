# Calendar Application

## Overview

This is a comprehensive voice-powered calendar scheduling application built with React and Express.js, now available as both a web application and browser extension. The application features user authentication, recurring event management with individual instance control, voice input for natural language event creation, and intelligent notifications for upcoming meetings.

## Recent Changes (August 2025)

### User Authentication System
- **Complete signup/login functionality** with bcrypt password hashing
- **Session-based authentication** with Express sessions
- **Protected API endpoints** requiring authentication
- **AuthModal component** with tabbed login/signup interface
- **AuthProvider context** for global authentication state management

### Browser Extension
- **Chrome Extension conversion** with manifest v3 support
- **Popup interface** (400x600px) loading the full calendar app
- **Background script** for event notifications and periodic monitoring
- **Content script** with floating button and keyboard shortcuts (Alt + C)
- **Cross-origin integration** supporting both localhost and Replit deployment
- **Automatic server detection** for seamless development and production use

### Enhanced Recurring Events
- **Individual instance management** - edit or delete specific recurring event occurrences
- **Exception tracking system** - maintains data integrity for modified instances
- **Smart expansion algorithm** - generates recurring events with proper duration limits
- **Series-wide vs instance-specific operations** with user choice dialog

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Radix UI with shadcn/ui design system
- **Styling**: Tailwind CSS with CSS variables for theming
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js REST API
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Storage**: Abstract storage interface with in-memory implementation (MemStorage)
- **API Design**: RESTful endpoints for CRUD operations on events and users

### Key Components
- **Calendar View**: Monthly calendar grid with event display and navigation
- **Event Management**: Modal-based event creation and editing with form validation
- **Voice Input**: Web Speech API integration for natural language event creation
- **Notification System**: Toast notifications for user feedback
- **Event Sidebar**: Quick event overview and management panel

### Database Schema
- **Events Table**: Stores event data with support for recurring events
  - Fields: id, title, description, startDate, endDate, isRecurring, recurringPattern, recurringWeeks, parentEventId, originalDate
- **Event Exceptions Table**: Tracks deleted/modified recurring event instances
  - Fields: id, parentEventId, exceptionDate, type (deleted/modified), modifiedEventId
- **Users Table**: Basic user management (authentication not fully implemented)
  - Fields: id, username, password

### Recurring Event Management
- **Individual Instance Control**: Users can edit or delete specific recurring event occurrences
- **Series-wide Changes**: Users can modify all events in a recurring series
- **Exception Tracking**: System tracks deleted and modified instances to maintain data integrity
- **Smart Expansion**: Recurring events are expanded dynamically based on date ranges and duration settings

### Data Flow
- Client-side state managed through React Query with automatic caching and revalidation
- RESTful API endpoints handle CRUD operations
- Form validation using Zod schemas shared between client and server
- Optimistic updates for better user experience

### Voice Integration
- **OpenAI Whisper Integration**: Advanced AI-powered speech-to-text transcription for high accuracy
- **Complete Voice Commands**: Create, edit, and delete events using natural language
- **Smart Event Matching**: Finds events by keywords for editing and deletion
- **Voice Feedback**: Speaks back confirmations using Web Speech API
- **Audio Recording**: Uses MediaRecorder API to capture high-quality audio
- **Multi-language Support**: Whisper supports multiple languages (currently configured for English)

### Development Features
- Hot module replacement in development
- TypeScript for type safety across the stack
- Path aliases for clean imports
- Environment-specific configuration

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection for Neon Database
- **drizzle-orm**: Type-safe ORM for database operations
- **drizzle-kit**: Database migration and schema management tools

### UI and Interaction
- **@radix-ui/***: Comprehensive set of accessible UI primitives
- **@tanstack/react-query**: Server state management and caching
- **wouter**: Lightweight client-side routing
- **react-hook-form**: Form state management and validation
- **@hookform/resolvers**: Form validation resolvers

### Styling and Design
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **clsx**: Conditional className utility
- **lucide-react**: Icon library

### Development Tools
- **vite**: Build tool and development server
- **typescript**: Static type checking
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay
- **@replit/vite-plugin-cartographer**: Replit-specific development features

### Date and Time
- **date-fns**: Date manipulation and formatting utilities

### Additional Features
- **embla-carousel-react**: Carousel component for UI elements
- **cmdk**: Command palette functionality
- **nanoid**: Unique ID generation