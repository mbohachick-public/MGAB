/**
 * Auth0 Configuration
 * 
 * Replace these values with your Auth0 credentials:
 * 1. Go to https://manage.auth0.com/
 * 2. Create a Native application
 * 3. Copy your Domain and Client ID
 * 4. Update the values below
 * 
 * Also update app.json with your domain and customScheme
 */

export const auth0Config = {
  domain: process.env.EXPO_PUBLIC_AUTH0_DOMAIN || 'YOUR_TENANT_REGION.auth0.com',
  clientId: process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID || 'YOUR_CLIENT_ID',
};
