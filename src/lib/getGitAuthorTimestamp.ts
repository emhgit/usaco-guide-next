// This function only works in Node.js environment (server-side)
let execSync: any;

// Only require child_process when running on the server
if (typeof window === 'undefined') {
  execSync = require('child_process').execSync;
}

export function getLastUpdated(filepath: string): string | null {
  // Return null if running on the client side
  if (typeof window !== 'undefined') {
    return null;
  }

  try {
    const result = execSync(`git log -1 --format=%ct "${filepath}"`, {
      encoding: 'utf-8',
    });
    return new Date(parseInt(result.trim()) * 1000).toISOString();
  } catch {
    return null;
  }
}

