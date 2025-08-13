import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Global teardown completed - cleaning up test resources');
  
  // Any cleanup tasks can go here
  // For now, just log completion
}

export default globalTeardown;

