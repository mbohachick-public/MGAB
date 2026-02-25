# Auth0 Setup Guide

This app now uses Auth0 for authentication. Follow these steps to configure it:

## 1. Create an Auth0 Account and Application

1. Go to https://auth0.com/ and sign up for a free account
2. In the Auth0 Dashboard, go to **Applications** > **Applications**
3. Click **Create Application**
4. Choose **Native** as the application type
5. Click **Create**

## 2. Configure Your Auth0 Application

### Get Your Credentials

After creating the application, you'll see:
- **Domain**: e.g., `your-tenant.us.auth0.com`
- **Client ID**: Copy this value

### Configure Callback URLs

In your Auth0 application settings, add these **Allowed Callback URLs**:

```
rentals://your-tenant.us.auth0.com/ios/rentals/callback,
rentals://your-tenant.us.auth0.com/android/rentals/callback
```

Replace `your-tenant.us.auth0.com` with your actual Auth0 domain.

### Enable Password Grant (for username/password login)

1. Go to **Settings** > **Advanced Settings** > **Grant Types**
2. Enable **Password** grant type
3. Click **Save Changes**

## 3. Configure Your App

### Option A: Using Environment Variables (Recommended)

1. Create a `.env` file in the `mobile` directory:
   ```
   EXPO_PUBLIC_AUTH0_DOMAIN=your-tenant.us.auth0.com
   EXPO_PUBLIC_AUTH0_CLIENT_ID=your_client_id_here
   ```

2. Install `expo-constants` if not already installed:
   ```bash
   npx expo install expo-constants
   ```

### Option B: Direct Configuration

1. Edit `mobile/auth/auth0Config.ts` and replace:
   - `YOUR_TENANT_REGION.auth0.com` with your Auth0 domain
   - `YOUR_CLIENT_ID` with your Client ID

2. Edit `mobile/app.json` and update the `domain` in the Auth0 plugin:
   ```json
   "plugins": [
     [
       "react-native-auth0",
       {
         "domain": "your-tenant.us.auth0.com",
         "customScheme": "rentals"
       }
     ]
   ]
   ```

## 4. Rebuild Your App

Since `react-native-auth0` requires native code, you **cannot use Expo Go**. You must create a development build:

```bash
# For Android
npx expo run:android

# For iOS
npx expo run:ios
```

## 5. Test Authentication

The app now supports two login methods:

1. **Auth0 Hosted Login** (Recommended): Click "Sign in with Auth0" to open Auth0's login page
2. **Username/Password**: Enter credentials directly (requires Password grant type enabled)

## Troubleshooting

- **"Invalid credentials"**: Make sure Password grant type is enabled in Auth0 Dashboard
- **"Callback URL mismatch"**: Verify callback URLs in Auth0 Dashboard match the format above
- **App crashes on Android**: Make sure you're using a development build, not Expo Go
