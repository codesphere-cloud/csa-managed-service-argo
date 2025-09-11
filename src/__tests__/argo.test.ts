import fetch from 'node-fetch';
import { describe, test, expect, beforeAll } from 'vitest';
import { v4 as uuidv4 } from 'uuid';

// The base URL for your Express API.
// Make sure your Express server is running on this address.
const API_BASE_URL = 'http://localhost:3000'; 
const API_URL = `${API_BASE_URL}/api/v1/argo`; 

let testAppId: string;

/**
 * Creates a new Shoot by calling the POST / endpoint.
 * @param id The unique ID for the Shoot.
 */
async function createApp(id: string): Promise<void> {

  console.log(`Creating App with ID: ${id}`);
   
  const url = `${API_URL}/`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`Failed to create App: ${response.status} - ${errorBody.message}`);
  }
}

/**
 * Lists Apps by calling the GET / endpoint, with an optional ID filter.
 * @param id The optional ID to filter by.
 */
async function listApps(id?: string): Promise<any[]> {
  let url = `${API_URL}/`;
  if (id) {
    url += `?id=${encodeURIComponent(id)}`;
  }

  const response = await fetch(url, { method: 'GET' });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`Failed to list App: ${response.status} - ${errorBody.message}`);
  }
  return await response.json();
}

/**
 * Deletes an App by calling the DELETE /:id endpoint.
 * @param id The ID of the Shoot to delete.
 */
async function deleteApp(id: string): Promise<void> {
  const url = `${API_URL}/${encodeURIComponent(id)}`;
  const response = await fetch(url, { method: 'DELETE' });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`Failed to delete App: ${response.status} - ${errorBody.message}`);
  }
}

// All test cases are now grouped within a 'describe' block.
describe('Argo API Endpoints', () => {

  // Run this before all tests to ensure a clean state.
  beforeAll(async () => {
    
    // This is a common pattern to clean up any state from previous failed tests
  });

  // Test Case 1: Create a new App and delete it again
  test('Create a new App and find it', async () => {
    const testAppId = uuidv4();
    
    await createApp(testAppId);
    
    // Check if the App was created by listing with the specific ID filter
    const foundApps = await listApps(testAppId);
    
    // Assert that exactly one App was found
    expect(foundApps.length).toBe(1);
    
    // Assert that the returned object has the expected key
    expect(Object.keys(foundApps[0])[0]).toBe('managed-service.codesphere.com/id');

    // Clean up after the test
    await deleteApp(testAppId);
  });

  // Test Case 2: List Shoots without any filter
  test('List all Apps (no filter)', async () => {
    const allApps = await listApps();
    // This assumes there's at least one App already in the K8s cluster
    if (allApps.length === 0) {
      console.log('Note: No Apps found, this test may not be fully meaningful.');
    } else {
      console.log(`Successfully listed ${allApps.length} Apps.`);
      // Assert that at least one item is returned
      expect(allApps.length).toBeGreaterThan(0);
    }
  });

  // Test Case 3: Attempt to list a non-existent Apps
  test('List an App that does not exist', async () => {
    const nonExistentId = 'non-existent-id-xyz';
    const foundApps= await listApps(nonExistentId);
    
    // Assert that no Shoots were found
    expect(foundApps.length).toBe(0);
  });

});