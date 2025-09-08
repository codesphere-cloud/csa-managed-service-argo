import fetch from 'node-fetch';
import { describe, test, expect, beforeAll } from 'vitest';
import { v4 as uuidv4 } from 'uuid';

// The base URL for your Express API.
// Make sure your Express server is running on this address.
const API_BASE_URL = 'http://localhost:3000'; 
const API_URL = `${API_BASE_URL}/api/v1/kubernetes`; 

/**
 * Creates a new Shoot by calling the POST / endpoint.
 * @param id The unique ID for the Shoot.
 */
async function createShoot(id: string): Promise<void> {

  console.log(`Creating Shoot with ID: ${id}`);
   
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
    throw new Error(`Failed to create Shoot: ${response.status} - ${errorBody.message}`);
  }
}

/**
 * Lists Shoots by calling the GET / endpoint, with an optional ID filter.
 * @param id The optional ID to filter by.
 */
async function listShoots(id?: string): Promise<any[]> {
  let url = `${API_URL}/`;
  if (id) {
    url += `?id=${encodeURIComponent(id)}`;
  }

  const response = await fetch(url, { method: 'GET' });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`Failed to list Shoots: ${response.status} - ${errorBody.message}`);
  }
  return await response.json();
}

/**
 * Deletes a Shoot by calling the DELETE /:id endpoint.
 * @param id The ID of the Shoot to delete.
 */
async function deleteShoot(id: string): Promise<void> {
  const url = `${API_URL}/${encodeURIComponent(id)}`;
  const response = await fetch(url, { method: 'DELETE' });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`Failed to delete Shoot: ${response.status} - ${errorBody.message}`);
  }
}

// All test cases are now grouped within a 'describe' block.
describe('Shoot API Endpoints', () => {

  // Run this before all tests to ensure a clean state.
  beforeAll(async () => {
    // This is a common pattern to clean up any state from previous failed tests
    await deleteShoot('test-shoot-1').catch(() => {});
    await deleteShoot('shoot-to-delete').catch(() => {});
  });

  // Test Case 1: Create a new Shoot and verify its creation
  test('Create a new Shoot and find it', async () => {
    const testShootId = uuidv4();
    
    await createShoot(testShootId);
    
    // Check if the Shoot was created by listing with the specific ID filter
    const foundShoots = await listShoots(testShootId);
    
    // Assert that exactly one Shoot was found
    expect(foundShoots.length).toBe(1);
    
    // Assert that the returned object has the expected key
    expect(Object.keys(foundShoots[0])[0]).toBe('managed-service.codesphere.com/id');

    // Clean up after the test
    await deleteShoot(testShootId);
  });

  // Test Case 2: List Shoots without any filter
  test('List all Shoots (no filter)', async () => {
    const allShoots = await listShoots();
    // This assumes there's at least one Shoot already in the K8s cluster
    if (allShoots.length === 0) {
      console.log('Note: No Shoots found, this test may not be fully meaningful.');
    } else {
      console.log(`Successfully listed ${allShoots.length} Shoots.`);
      // Assert that at least one item is returned
      expect(allShoots.length).toBeGreaterThan(0);
    }
  });

  // Test Case 3: Attempt to list a non-existent Shoot
  test('List a Shoot that does not exist', async () => {
    const nonExistentId = 'non-existent-id-xyz';
    const foundShoots = await listShoots(nonExistentId);
    
    // Assert that no Shoots were found
    expect(foundShoots.length).toBe(0);
  });

  // Test Case 4: Delete a Shoot and confirm it's gone
  test('Delete a Shoot', async () => {
    const idToDelete = 'shoot-to-delete';
    await createShoot(idToDelete);
    let shoots = await listShoots(idToDelete);
    
    // Assert the Shoot was created successfully
    expect(shoots.length).toBe(1);
    
    await deleteShoot(idToDelete);
    
    shoots = await listShoots(idToDelete);
    
    // Assert the Shoot was deleted
    expect(shoots.length).toBe(0);
  });
});