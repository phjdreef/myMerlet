# myMerlet - Classroom Seating Manager

A modern desktop application for managing classroom seating arrangements with integration to the Magister school management system.

![Classroom Seating App](images/demo.gif)

## Features 🎯

- **Student Management**: Browse and search students from Magister API
- **Classroom Layout**: Interactive drag-and-drop seating arrangement (8-column grid)
- **Photo Integration**: Automatic student photo fetching and caching
- **Class Filtering**: View and manage students by class
- **Persistent Storage**: Local database for offline access and photo caching
- **Multi-language Support**: Dutch (default), English, and Portuguese
- **Drag & Drop**: Intuitive seat swapping and student placement
- **Offline Mode**: Works with cached student data when offline

## Tech Stack 🏍️

### Core
- [Electron 38](https://www.electronjs.org) - Desktop application framework
- [Vite 7](https://vitejs.dev) - Fast build tool
- [TypeScript 5.9](https://www.typescriptlang.org) - Type safety

### Frontend 🎨
- [React 19](https://reactjs.org) - UI library
- [Tailwind 4](https://tailwindcss.com) - CSS framework
- [Shadcn UI](https://ui.shadcn.com) - Component library
- [TanStack Router](https://tanstack.com/router) - File-based routing
- [i18next](https://www.i18next.com) - Internationalization
- [Lucide](https://lucide.dev) - Icons

### Backend & Data
- **Magister API Integration**: OAuth/OIDC authentication
- **JSON File Storage**: Local student database and photo cache
- **Custom Logger**: Production-ready logging utility

### Development Tools 🛠️
- [ESLint 9](https://eslint.org) - Code linting
- [Prettier](https://prettier.io) - Code formatting
- [Vitest](https://vitest.dev) - Unit testing
- [Playwright](https://playwright.dev) - E2E testing

## Project Structure

```plaintext
.
└── src/
    ├── assets/          # Fonts and static assets
    ├── components/      # React components
    │   ├── student-directory/  # Student list and classroom grid
    │   ├── template/    # Base template components
    │   └── ui/          # Shadcn UI components
    ├── helpers/         # IPC communication helpers
    │   └── ipc/         # Theme, window, magister, studentdb channels
    ├── layouts/         # Page layouts
    ├── localization/    # i18n configuration (nl, en, pt-BR)
    ├── routes/          # TanStack Router pages
    ├── services/        # Business logic
    │   ├── magister-api.ts        # Magister API integration
    │   ├── student-database.ts    # Renderer database interface
    │   └── main-student-database.ts # Main process database
    ├── styles/          # Global CSS
    ├── tests/           # Unit and E2E tests
    ├── types/           # TypeScript type definitions
    └── utils/           # Utilities (logger, platform, etc.)
```

## Key Components

### MagisterDashboard
Main dashboard with two tabs:
- **Overview**: API connection, data refresh, photo downloads
- **Students**: Student directory and classroom views

### StudentDirectory
- List view: Searchable student cards
- Classroom view: 8-column drag-and-drop grid
- Class filtering sidebar
- Persistent seating positions (localStorage)

### ClassroomGrid
- Dynamic 8-column layout
- Drag & drop with three modes:
  - Swap: Exchange two seated students
  - Displacement: Move unseated student, unseat existing
  - Simple: Place student in empty seat

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Magister school account (for API access)

### Installation

1. Clone this repository
```bash
git clone https://github.com/yourusername/myMerlet.git
cd myMerlet
```

2. Install dependencies
```bash
npm install
```

3. Run the app
```bash
npm start
```

## NPM Scripts

```bash
npm run <script>
```

- `start` - Start development mode with hot reload
- `package` - Package application for distribution
- `make` - Create platform-specific installers
- `publish` - Publish to distribution service
- `lint` - Run ESLint
- `format` - Check code formatting
- `format:write` - Apply Prettier formatting
- `test` - Run unit tests (Vitest)
- `test:watch` - Run tests in watch mode
- `test:e2e` - Run E2E tests (Playwright)
- `test:all` - Run all tests

> **Note**: E2E tests require the app to be packaged first (`npm run package`)

## Configuration

### Magister API
The app authenticates with Magister using OAuth/OIDC flow. On first launch:
1. Click "Vernieuwen vanuit API" in the Overview tab
2. Log in with your Magister credentials
3. Grant access permissions
4. Students will be automatically fetched and cached

### Database
- Student data: `~/Library/Application Support/electron-shadcn/magister_students.json`
- Photo cache: `~/Library/Application Support/electron-shadcn/magister_photos.json`
- Seating positions: Browser localStorage

### Languages
Default language is Dutch (nl). Switch languages using the toggle in the app header.

Available languages:
- 🇳🇱 Nederlands (Dutch)
- 🇬🇧 English
- 🇧🇷 Português (Portuguese)

## Features in Detail

### Student Photo Management
- Automatic fetching from Magister API
- Base64 encoding for cross-process compatibility
- Persistent disk cache
- Graceful fallback to initials avatar
- Request deduplication to prevent API spam

### Seating Arrangements
- Per-class seating layouts
- Persistent across app restarts
- Visual drag & drop feedback
- Opacity effects during drag
- Automatic position saving

### Offline Support
- Works with cached student data
- Cached photos available offline
- Local seating positions always accessible

## Development

### Adding New Features
1. Services go in `src/services/`
2. Components in `src/components/`
3. IPC channels in `src/helpers/ipc/`
4. Translations in `src/localization/i18n.ts`

### Logging
Use the logger utility instead of console:
```typescript
import { logger } from './utils/logger';

logger.debug('Debug info'); // Development only
logger.log('Info');         // Development only
logger.warn('Warning');     // Development only
logger.error('Error');      // Always logged
```

### IPC Communication
Example of adding a new IPC channel:
1. Create channel definition in `src/helpers/ipc/your-feature/your-feature-channels.ts`
2. Add context exposer in `src/helpers/ipc/your-feature/your-feature-context.ts`
3. Register listeners in `src/helpers/ipc/your-feature/your-feature-listeners.ts`
4. Import in main IPC files

## Troubleshooting

### Authentication Issues
- Clear stored tokens: Click "Logout" in Overview tab
- Check Magister server status
- Verify credentials

### Photo Loading Issues
- Check internet connection
- Clear photo cache and re-download
- Check Magister API permissions

### Seating Not Saving
- Check browser localStorage is enabled
- Look for errors in console (Cmd+Option+I)
- Verify class is selected

## Building for Production

```bash
# Create distributable
npm run make

# Outputs will be in:
# - macOS: out/make/zip/darwin/arm64/
# - Windows: out/make/squirrel.windows/x64/
# - Linux: out/make/deb/x64/
```

## Credits

Built on the [electron-shadcn](https://github.com/LuanRoger/electron-shadcn) template by LuanRoger.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues related to:
- **Magister API**: Check Magister documentation
- **App bugs**: Open an issue on GitHub
- **Feature requests**: Open an issue with the "enhancement" label

---

**Note**: This application is designed for use with the Magister school management system. You need valid Magister credentials to use the API features.
