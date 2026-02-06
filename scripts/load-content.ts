async function needsRebuild(): Promise<boolean> {
  const { access } = await import('fs/promises');
  const { DB_FILE } = await import('../src/lib/constants');
  // In production, always rebuild
  // if (process.env.NODE_ENV === 'production') return true;

  try {
    // Check if both cache files exist
    await access(DB_FILE);
    console.log('Using cached content. Run with NODE_ENV=production to force rebuild.');
    return false;
  } catch (error) {
    // If any cache file is missing, rebuild everything
    return true;
  }
}

async function load() {
  try {
    console.log("Starting to load content...");
    const rebuild = await needsRebuild();
    if (rebuild) {
      const { main } = await import('./index-content');
      await main();
    }
  } catch (error) {
    console.error("Error loading content:");
    console.error(error);
  } finally {
    // Ensure the process exits, but give time for logs to flush
    setTimeout(() => process.exit(0), 100);
  }
}

load();