import fetch from 'node-fetch';
import { describe, test, expect, beforeAll } from 'vitest';
import { v4 as uuidv4 } from 'uuid';

// The base URL for your Express API.
// Make sure your Express server is running on this address.
const API_BASE_URL = 'http://localhost:3000';
const API_URL = `${API_BASE_URL}/api/v1/helm`;
const API_TOKEN = process.env.API_TOKEN || 'test-token';

// Example instance configuration for testing
const TEST_INSTANCE_CONFIG = {
  repoUrl: 'https://github.com/example/helm-charts.git',
  targetRevision: 'main',
  path: 'charts/example',
  helmValues: {
    replicaCount: 1,
  },
};

/**
 * Creates a new Helm release by calling the POST / endpoint.
 * @param id The unique ID for the release.
 * @param instanceConfig The Helm chart configuration.
 * @param teamId Optional team ID (required for shared_cluster mode).
 * @param appName Optional app name (required for shared_cluster mode).
 */
async function createRelease(
  id: string,
  instanceConfig = TEST_INSTANCE_CONFIG,
  teamId?: string,
  appName?: string,
): Promise<void> {
  console.log(`Creating Helm release with ID: ${id}`);

  const url = `${API_URL}/`;
  const body: any = { id, instanceConfig };

  if (teamId) body.teamId = teamId;
  if (appName) body.appName = appName;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`Failed to create release: ${response.status} - ${JSON.stringify(errorBody)}`);
  }
}

/**
 * Lists Helm releases by calling the GET / endpoint, with an optional ID filter.
 * @param id The optional ID to filter by.
 */
async function listReleases(id?: string): Promise<any> {
  let url = `${API_URL}/`;
  if (id) {
    url += `?id=${encodeURIComponent(id)}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`Failed to list releases: ${response.status} - ${JSON.stringify(errorBody)}`);
  }
  return await response.json();
}

/**
 * Updates a Helm release by calling the PATCH /:id endpoint.
 * @param id The ID of the release to update.
 * @param instanceConfig The partial configuration to update.
 */
async function updateRelease(id: string, instanceConfig: any): Promise<void> {
  const url = `${API_URL}/${encodeURIComponent(id)}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_TOKEN}`,
    },
    body: JSON.stringify({ instanceConfig }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`Failed to update release: ${response.status} - ${JSON.stringify(errorBody)}`);
  }
}

/**
 * Deletes a Helm release by calling the DELETE /:id endpoint.
 * @param id The ID of the release to delete.
 */
async function deleteRelease(id: string): Promise<void> {
  const url = `${API_URL}/${encodeURIComponent(id)}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`Failed to delete release: ${response.status} - ${JSON.stringify(errorBody)}`);
  }
}

// All test cases are now grouped within a 'describe' block.
describe('Helm API Endpoints', () => {

  // Run this before all tests to ensure a clean state.
  beforeAll(async () => {
    // This is a common pattern to clean up any state from previous failed tests
  });

  // Test Case 1: Create a new Helm release and verify it
  test('Create a new Helm release and find it', async () => {
    const testReleaseId = uuidv4();

    await createRelease(testReleaseId);

    // Check if the release was created by listing with the specific ID filter
    const releases = await listReleases(testReleaseId);

    // Assert that the release exists in the response
    expect(releases).toBeDefined();
    expect(releases[testReleaseId]).toBeDefined();
    expect(releases[testReleaseId].config).toBeDefined();
    expect(releases[testReleaseId].details).toBeDefined();

    // Clean up after the test
    await deleteRelease(testReleaseId);
  }, 60000); // Increase timeout for Helm operations

  // Test Case 2: List all releases without any filter
  test('List all Helm releases (no filter)', async () => {
    const allReleases = await listReleases();

    // This should return an array of release IDs
    expect(Array.isArray(allReleases)).toBe(true);
    console.log(`Successfully listed ${allReleases.length} releases.`);
  });

  // Test Case 3: Attempt to list a non-existent release
  test('List a release that does not exist', async () => {
    const nonExistentId = 'non-existent-id-xyz';
    const releases = await listReleases(nonExistentId);

    // Assert that no releases were found (empty object)
    expect(Object.keys(releases).length).toBe(0);
  });

  // Test Case 4: Update an existing release
  test('Update a Helm release', async () => {
    const testReleaseId = uuidv4();

    // Create the release
    await createRelease(testReleaseId);

    // Update the release with new values
    await updateRelease(testReleaseId, {
      helmValues: {
        replicaCount: 2,
      },
    });

    // Verify the update
    const releases = await listReleases(testReleaseId);
    expect(releases[testReleaseId]).toBeDefined();

    // Clean up
    await deleteRelease(testReleaseId);
  }, 60000);

  // Test Case 5: Delete a non-existent release should fail
  test('Delete a non-existent release should return 404', async () => {
    const nonExistentId = 'non-existent-id-xyz';

    try {
      await deleteRelease(nonExistentId);
      // If no error is thrown, fail the test
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.message).toContain('404');
    }
  });

});