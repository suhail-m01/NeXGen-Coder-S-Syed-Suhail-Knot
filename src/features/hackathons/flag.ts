/** Single public kill switch for every Hackathon Discovery UI surface. Active by default, can be switched off with NEXT_PUBLIC_ENABLE_HACKATHONS=false */
export const hackathonsEnabled =
  import.meta.env.NEXT_PUBLIC_ENABLE_HACKATHONS !== 'false' &&
  import.meta.env.VITE_ENABLE_HACKATHONS !== 'false';
