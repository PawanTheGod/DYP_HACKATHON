# StudyOS — AI-Powered Adaptive Study Planner

StudyOS is a state-of-the-art study planning application that uses AI to adapt to your learning pace and energy levels.

## Tech Stack
- **Framework**: React 18 + Next.js 14 / Vite
- **Styling**: TailwindCSS
- **AI**: Groq API (LPU-powered for near-instant responses)
- **Storage**: LocalStorage + IndexedDB

## Project Structure
- `src/types/`: TypeScript interfaces and types
- `src/context/`: React Context for global state management
- `src/lib/`: Core logic and utility modules
- `src/components/`: Reusable UI components
- `src/pages/`: Main application screens

## Getting Started
1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and add your API keys
4. Run development server: `npm run dev`

## Team Allocation
- **Person 1**: AI Integration & Core Logic (lib/)
- **Person 2**: Feature Screens (components/ & pages/)
- **Person 3**: Data Persistence & State (context/ & lib/dataStore.ts)
- **Person 4**: UI System & Layout (components/ui/ & styles/)
