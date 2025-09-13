# Overview

This is a Telegram Mini App for anonymous chat/messaging that runs inside the Telegram WebApp environment. The application provides a minimal MVP for testing anonymous chat functionality before deployment to a full server (VPS/Docker). Users can access the app through a Telegram bot, authenticate using Telegram's initData, and participate in global chat rooms with anonymous profiles.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Framework**: Tailwind CSS with shadcn/ui component library for consistent design
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Communication**: WebSocket connection for live chat functionality

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Real-time**: WebSocket implementation for chat messaging
- **Authentication**: Telegram WebApp initData verification using HMAC-SHA256
- **API Design**: RESTful API for authentication and data operations, WebSocket for real-time chat

## Database Schema
- **Users Table**: Stores Telegram ID, username, anonymous name, and approval status
- **Rooms Table**: Chat rooms with global and private room types
- **Messages Table**: Chat messages linked to users and rooms with timestamps
- **User Status System**: Pending/approved/rejected status for moderation workflow

## Authentication & Authorization
- **Telegram Integration**: Uses Telegram WebApp initData for secure authentication
- **Anonymous Profiles**: Generates random anonymous names while maintaining session security
- **Moderation System**: Admin approval workflow through Telegram bot commands
- **Session Management**: Stateless authentication using Telegram's cryptographic verification

## Real-time Communication
- **WebSocket Protocol**: Direct WebSocket connection for instant messaging
- **Message Broadcasting**: Real-time message delivery to all connected clients
- **Connection Management**: Automatic reconnection and connection state tracking
- **Room-based Messaging**: Support for global chat and future private room functionality

# External Dependencies

## Database
- **Neon Database**: PostgreSQL-compatible serverless database using @neondatabase/serverless
- **Connection Pooling**: Configured for serverless environments with WebSocket support

## Telegram Integration
- **Telegram Bot API**: node-telegram-bot-api for bot functionality and admin commands
- **WebApp API**: Browser-based Telegram WebApp SDK for client authentication
- **Bot Token**: Required environment variable for Telegram bot operations

## Development Tools
- **Build System**: Vite with TypeScript support and React plugin
- **Code Quality**: TypeScript for type safety and ESLint configuration
- **UI Components**: Radix UI primitives with shadcn/ui styling system
- **Styling**: Tailwind CSS with PostCSS processing

## Deployment Environment
- **Replit Integration**: Configured for Replit deployment with development plugins
- **Environment Variables**: DATABASE_URL, TELEGRAM_BOT_TOKEN, WEBAPP_URL for configuration
- **Hot Reload**: Development server with HMR support for rapid iteration