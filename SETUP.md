# Setup Guide

## Prerequisites
- [Docker](https://www.docker.com/get-started) installed on your machine.
- [Git](https://git-scm.com/) to clone the repository.

## Running with Docker

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <repository-url>
   cd dsa-revisit-system
   ```

2. **Start the application**:
   Run the following command in the root directory:
   ```bash
   docker compose up --build
   ```
   
   This will:
   - Build the backend and frontend images.
   - Start the PostgreSQL database and initialize it with the schema.
   - Start the backend server on port `8080`.
   - Start the frontend development server on port `5174`.

3. **Access the Application**:
   - Frontend: [http://localhost:5174](http://localhost:5174)
   - Backend API: [http://localhost:8080/api/health](http://localhost:8080/api/health)
   - Database: Accessible on port `5432`.

4. **Stopping the Application**:
   Press `Ctrl+C` in the terminal where `docker compose up` is running, or run:
   ```bash
   docker compose down
   ```

## Troubleshooting

- **Database Connection Issues**: Ensure no other service is using port `5432` on your host machine. If so, either stop that service or modify the port mapping in `docker-compose.yml`.
- **Frontend Hot Reload**: If hot reloading doesn't work, ensure you are using a recent version of Docker Desktop.
