// Base64 encoded logo for React-PDF
// This is a placeholder - we'll need to convert the actual logo
export const CAELUM_LOGO_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

// Alternative: Use a public URL if deployed
export const CAELUM_LOGO_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-domain.com/images/caelum-logo.png'
  : 'http://localhost:3000/images/caelum-logo.png';