# Magister Integration

This application includes integration with Magister to display your school schedule and information.

## Features

- **Secure Authentication**: Login through Magister's official website in a secure browser window
- **Today's Schedule**: View your classes, times, locations, and teachers for today
- **User Information**: Display your profile information from Magister
- **Announcements & Assignments**: See important announcements and assignments (when available)
- **Automatic Token Management**: Securely store and refresh authentication tokens

## How to Use

1. **Navigate to Magister**: Click the "Magister" link in the navigation menu
2. **Login**: Click "Login to Magister" to open the authentication window
3. **Authenticate**: Complete the login process on the Magister website
4. **View Data**: Once authenticated, your schedule and information will be displayed
5. **Refresh**: Use the refresh button to get the latest information
6. **Logout**: Use the logout button to clear your authentication

## Security

- Your login credentials are never stored by this application
- Authentication is handled through Magister's official website
- JWT tokens are securely stored and automatically managed
- All communication with Magister uses HTTPS

## API Endpoints

The integration attempts to connect to several common Magister API endpoints:

- `/api/leerlingen/agenda` - Student schedule
- `/api/agenda/vandaag` - Today's agenda
- `/api/v1/agenda` - Agenda API v1
- `/api/personen/leerling/agenda` - Student person agenda
- `/api/account` - Account information
- `/api/personen/leerling` - Student person info
- `/api/v1/leerling` - Student API v1
- `/api/leerling` - Student info

## Troubleshooting

If you encounter issues:

1. **Login Failed**: Try clearing your browser cache and logging in again
2. **No Data**: Check if you have the correct permissions on your Magister account
3. **Connection Issues**: Ensure you have a stable internet connection
4. **Token Expired**: The app will automatically prompt you to login again when needed

## Technical Details

- Built with Electron for secure cross-platform desktop access
- Uses IPC communication between main and renderer processes
- Implements secure token storage using Electron's session management
- Follows Magister's authentication flow and API patterns
