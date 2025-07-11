# NoteMaster Frontend

This is the **React frontend** for the NoteMaster application. It provides a responsive, modern, minimalistic user interface for managing notes.

## Features

- **User authentication** (register & login)
- **Create, read, update, delete notes**
- **Search notes** (search term matches title and content)
- **Responsive layout**: sidebar for navigation, main area for notes and editing, top bar for search and user actions
- **Modern light minimalistic design** using CSS and CSS variables
- **API integration**: Interacts with the Django backend's REST API for authentication and notes.

## Technology stack

- React 18+ (no heavy UI frameworks)
- Pure CSS (see `src/App.css`)
- Uses `fetch` for API requests

## How to run

1. Make sure you have [Node.js](https://nodejs.org/) installed
2. In this folder, install dependencies:

   ```
   npm install
   ```

3. Run the app in development mode:

   ```
   npm start
   ```

4. The app expects a backend at `/api`. If your backend is at a different location, set `REACT_APP_API_BASE` in your environment, e.g.:

   ```
   REACT_APP_API_BASE="http://localhost:8000/api" npm start
   ```

## Folder contents

- `src/App.js` — Main application logic and UI
- `src/App.css` — Main styles and theming

## API integration

- Uses backend endpoints:
  - `POST /api/auth/login/` — login, returns `{token, user}`
  - `POST /api/auth/register/` — register
  - `GET /api/user/me/` — get current user info
  - `GET /api/notes/?q=search` — list/search notes
  - `POST /api/notes/` — create note
  - `PUT /api/notes/:id/` — update note
  - `DELETE /api/notes/:id/` — delete note

For API errors, user-friendly messages will be shown where possible.

## Customizing theme

Main colors are set as CSS variables in `src/App.css`:

- `--primary`: #4F8EF7
- `--secondary`: #232F34
- `--accent`: #F76F8E

## License

MIT
