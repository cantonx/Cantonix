# Canton Network Web App

A web application for managing Canton Network validators and swapping Canton Coin (CC).

## Features

- **Validator Dashboard**: Monitor validator health, rewards, and onboard new validators
- **CC Swap Interface**: Swap CC via Canton Wallet integration (coming soon)

## Setup

1. Clone this repository
2. Copy `.env.example` to `.env` and configure environment variables
3. Install dependencies: `npm install` in both `frontend/` and `backend/`
4. Start the backend: `cd backend && npm run dev`
5. Start the frontend: `cd frontend && npm run dev`
6. Open the UI at http://localhost:5173

## Environment Variables

See `.env.example` for required variables.

## Development

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
npm install
npm run dev
```

## Docker

Use docker-compose to run the application:

```bash
docker-compose up --build
```

Note: Integrate with your existing Splice LocalNet docker-compose setup.