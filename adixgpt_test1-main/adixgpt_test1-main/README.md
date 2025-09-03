# AI Chatbot Application

A full-stack AI chatbot application with React frontend and Express.js backend, featuring a beautiful glassmorphic design with purple-blue gradients.

## Features

- 🤖 **Multiple AI Models**: Support for GPT-5, GPT-4o, GPT-4, and GPT-3.5-turbo via GitHub Models API
- 👤 **Username Authentication**: Simple localStorage-based user authentication
- 💬 **Chat Management**: Create, manage, and delete multiple chat conversations
- ⚙️ **Model Configuration**: Edit all AI providers including endpoints, rate limits, and API keys
- 🎨 **Beautiful UI**: Glassmorphic design with purple-blue gradients and smooth animations
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- 💾 **Data Persistence**: Chat history and settings stored in localStorage

## Tech Stack

### Frontend
- **React** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Radix UI** components for accessibility
- **TanStack Query** for state management
- **Wouter** for routing

### Backend
- **Express.js** with TypeScript
- **Drizzle ORM** with PostgreSQL
- **GitHub Models API** for AI integration
- **Rate limiting** and error handling

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- GitHub token with access to GitHub Models

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-chatbot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create .env file in root directory
   echo "GITHUB_TOKEN=your_github_token_here" > .env
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   - Navigate to `http://localhost:5000`
   - Enter your username to start chatting!

## Available Scripts

- `npm run dev` - Start development server (both frontend and backend)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run type-check` - Run TypeScript type checking

## Configuration

### AI Models
The application supports multiple AI models through GitHub Models API:
- GPT-5 (default) - 200k input, 100k output tokens
- GPT-4o - 128k context window
- GPT-4 - 8k context window  
- GPT-3.5-turbo - 4k context window

All models can be configured in the settings panel including:
- Display name
- API endpoint
- Rate limits (requests per minute)
- Model ID
- API key (optional for GitHub Models)

### Authentication
- Username-only authentication using localStorage
- No password required for simplicity
- User data persists across browser sessions

### Data Storage
- **Chat data**: Stored in localStorage for instant access
- **User preferences**: Settings and model configurations in localStorage
- **Backend database**: PostgreSQL for scalable data management (optional)

## Architecture

```
├── client/          # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Page components
│   │   ├── lib/         # Utilities and API
│   │   └── hooks/       # Custom React hooks
├── server/          # Express backend
│   ├── routes.ts    # API routes
│   ├── storage.ts   # Data layer
│   └── index.ts     # Server entry
├── shared/          # Shared types and schemas
└── README.md        # This file
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Author

Built by **Aditya Sagar**

---

For deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)