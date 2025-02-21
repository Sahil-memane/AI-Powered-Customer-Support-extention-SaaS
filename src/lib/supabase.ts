import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Create Supabase client with retries and timeouts
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage
  },
  global: {
    headers: {
      'x-application-name': 'customer-support-saas'
    }
  }
});

// Connection state management
let isConnected = false;
let connectionCheckPromise: Promise<boolean> | null = null;
let lastCheckTime = 0;
const CHECK_INTERVAL = 30000; // 30 seconds

export const checkConnection = async () => {
  try {
    // Check if we've checked recently
    const now = Date.now();
    if (isConnected && (now - lastCheckTime) < CHECK_INTERVAL) {
      return true;
    }

    // First check if we can connect to Supabase
    const { error: healthError } = await supabase.from('tickets').select('count').single();
    
    if (healthError && healthError.code === 'PGRST116') {
      // This error means the query worked but returned no rows, which is fine for a connection test
      lastCheckTime = now;
      isConnected = true;
      return true;
    }
    
    if (healthError) {
      console.error('Supabase connection test failed:', healthError);
      isConnected = false;
      return false;
    }

    lastCheckTime = now;
    isConnected = true;
    return true;
  } catch (error) {
    console.error('Failed to connect to Supabase:', error);
    isConnected = false;
    return false;
  }
};

export const ensureConnection = async () => {
  if (isConnected && (Date.now() - lastCheckTime) < CHECK_INTERVAL) {
    return true;
  }

  if (!connectionCheckPromise) {
    connectionCheckPromise = checkConnection().then(connected => {
      isConnected = connected;
      connectionCheckPromise = null;
      return connected;
    });
  }

  return connectionCheckPromise;
};
