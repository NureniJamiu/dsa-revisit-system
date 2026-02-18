# DSA Revisit System

A modern web application designed to help users master Data Structures & Algorithms (DSA) through spaced repetition and daily email reminders.

## Features

- **Personalized Dashboard**: Track your progress and manage your DSA problem list.
- **Spaced Repetition**: Intelligent scheduling of problem revisits to optimize learning.
- **Daily Email Reminders**: Get notified about problems you need to revisit.
- **Clerk Authentication**: Secure user sign-in and account management.
- **Modern UI**: A sleek, responsive frontend built with React and Tailwind CSS.

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/)
- [Clerk Account](https://clerk.com/) (for authentication)

### Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/dsa-revisit-system.git
   cd dsa-revisit-system
   ```

2. **Environment Variables**:
   Copy `.env.example` to `.env` and fill in the required values (Clerk keys, SMTP settings, etc.).
   ```bash
   cp .env.example .env
   ```

3. **Run with Docker**:
   ```bash
   docker compose up --build
   ```
   The application will be available at `http://localhost:5173`.

## Documentation

- [Setup Guide](SETUP.md)
- [Email Configuration](EMAIL_SETUP_GUIDE.md)
- [Deployment Info](DEPLOYMENT.md)

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Clerk
- **Backend**: Go (Golang), Gorm
- **Database**: PostgreSQL
- **Infrastructure**: Docker, Docker Compose
