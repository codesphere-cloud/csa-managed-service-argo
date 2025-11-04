# Helm Managed Service Provider

A microservice for deploying and managing custom Helm charts across Kubernetes clusters. This service provides a REST API for creating, updating, and deleting Helm releases with support for both shared cluster and custom cluster deployment modes.

## Features

- Deploy any Helm chart from a Git repository
- Two deployment modes: `shared_cluster` and `custom_cluster`
- Namespace pattern support for multi-tenant deployments
- Helm release lifecycle management (create, update, delete, list)
- Metadata tracking via Kubernetes ConfigMaps
- Token-based authentication
- Type-safe configuration with Zod validation

## Architecture

The service acts as a management layer for Helm deployments, providing:
- REST API for Helm operations
- Metadata persistence in Kubernetes ConfigMaps
- Support for multiple deployment models
- Git-based Helm chart sources

## Configuration

### Global Configuration (Environment Variables)

The service requires the following environment variables:

```bash
# Server configuration
NODE_ENV=development|production|test
PORT=3000
API_TOKEN=your-secret-token

# Global Helm service configuration
MODE=shared_cluster|custom_cluster

# Required for shared_cluster mode
KUBECONFIG=/path/to/kubeconfig
NAMESPACE_PATTERN=team-{teamId}-{appName}
```

### Deployment Modes

#### 1. Shared Cluster Mode (`shared_cluster`)

In this mode, all Helm releases are deployed to a single Kubernetes cluster. Namespaces are generated using a pattern.

**Required Global Config:**
- `KUBECONFIG`: Path to kubeconfig for the shared cluster
- `NAMESPACE_PATTERN`: Pattern for generating namespaces (e.g., `team-{teamId}-{appName}`)

**Instance Config:**
- `kubeConfig`: Not allowed (uses global kubeConfig)
- `namespace`: Not allowed (generated from pattern)
- Must provide `teamId` and `appName` in API requests

**Example namespace pattern:**
```
team-{teamId}-{appName} → team-engineering-frontend
```

#### 2. Custom Cluster Mode (`custom_cluster`)

In this mode, each Helm release can target a different Kubernetes cluster with a custom namespace.

**Required Global Config:**
- None (handled per instance)

**Instance Config:**
- `kubeConfig`: Required (path to kubeconfig for target cluster)
- `namespace`: Required (explicit namespace name)
- `teamId` and `appName` are optional

## API Reference

Base URL: `/api/v1/helm`

All endpoints require Bearer token authentication:
```
Authorization: Bearer <API_TOKEN>
```

### 1. List Helm Releases

**GET** `/api/v1/helm/`

List all managed Helm releases or filter by specific ID(s).

**Query Parameters:**
- `id` (optional): Filter by instance ID(s)

**Response (without ID filter):**
```json
["instance-id-1", "instance-id-2"]
```

**Response (with ID filter):**
```json
{
  "instance-id-1": {
    "config": {
      "repoUrl": "https://github.com/example/charts.git",
      "targetRevision": "main",
      "path": "charts/app"
    },
    "details": {
      "releaseName": "managed-instance-id-1",
      "namespace": "team-engineering-frontend",
      "status": "deployed",
      "lastDeployed": "2025-11-03T10:00:00Z",
      "createdAt": "2025-11-01T10:00:00Z",
      "updatedAt": "2025-11-03T10:00:00Z"
    }
  }
}
```

### 2. Create Helm Release

**POST** `/api/v1/helm/`

Create a new Helm release.

**Request Body (shared_cluster mode):**
```json
{
  "id": "unique-instance-id",
  "teamId": "engineering",
  "appName": "frontend",
  "instanceConfig": {
    "repoUrl": "https://github.com/example/charts.git",
    "targetRevision": "main",
    "path": "charts/app",
    "helmValues": {
      "replicaCount": 2,
      "image": {
        "repository": "myapp",
        "tag": "1.0.0"
      }
    }
  }
}
```

**Request Body (custom_cluster mode):**
```json
{
  "id": "unique-instance-id",
  "instanceConfig": {
    "repoUrl": "https://github.com/example/charts.git",
    "targetRevision": "main",
    "path": "charts/app",
    "kubeConfig": "/path/to/customer/kubeconfig",
    "namespace": "production",
    "helmValues": {
      "replicaCount": 3
    }
  }
}
```

**Response:**
```json
{
  "message": "Helm release created successfully",
  "release": {
    "id": "unique-instance-id",
    "releaseName": "managed-unique-instance-id",
    "namespace": "team-engineering-frontend",
    "createdAt": "2025-11-03T10:00:00Z"
  }
}
```

### 3. Update Helm Release

**PATCH** `/api/v1/helm/:id`

Update an existing Helm release.

**Request Body:**
```json
{
  "instanceConfig": {
    "targetRevision": "v2.0.0",
    "helmValues": {
      "replicaCount": 5
    }
  }
}
```

**Response:**
```json
{
  "message": "Helm release updated successfully",
  "release": {
    "id": "unique-instance-id",
    "releaseName": "managed-unique-instance-id",
    "namespace": "team-engineering-frontend",
    "updatedAt": "2025-11-03T11:00:00Z"
  }
}
```

### 4. Delete Helm Release

**DELETE** `/api/v1/helm/:id`

Delete a Helm release.

**Response:**
```json
{
  "message": "Helm release unique-instance-id deleted successfully"
}
```

## Instance Configuration Schema

```typescript
{
  repoUrl: string;           // Git repository URL
  targetRevision: string;    // Branch, tag, or commit SHA
  path: string;              // Path to Helm chart in repository
  kubeConfig?: string;       // Path to kubeconfig (custom_cluster only)
  namespace?: string;        // Target namespace (custom_cluster only)
  helmValues?: object;       // Helm values to override
}
```

## Prerequisites

### Kubernetes Access

For `shared_cluster` mode, you need a kubeconfig with permissions to:
- Create, read, update, and delete namespaces
- Deploy Helm charts
- Create and manage ConfigMaps in the `helm-managed-services` namespace

**Recommended: Use a Service Account**

Since OIDC browser login flows are not easily supported in automated environments, create a Service Account:

1. Create a Service Account with appropriate permissions
2. Download the Service Account kubeconfig
3. Set `KUBECONFIG` to the path of the downloaded file

### Helm CLI

The service requires the `helm` CLI to be installed and available in the system PATH.

Install Helm:
```bash
# macOS
brew install helm

# Linux
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

### Git Access

The service needs Git access to clone Helm chart repositories. Ensure:
- Git is installed
- SSH keys or credentials are configured for private repositories
- The service can clone from the specified repository URLs

## Development

### Setup

```bash
pnpm install
```

### Environment Variables

Create a `.env` file:

```bash
NODE_ENV=development
PORT=3000
API_TOKEN=your-secret-token

# For shared_cluster mode
MODE=shared_cluster
KUBECONFIG=/path/to/kubeconfig
NAMESPACE_PATTERN=team-{teamId}-{appName}

# For custom_cluster mode
MODE=custom_cluster
```

### Run Development Server

```bash
pnpm run dev
```

### Build

```bash
pnpm run build
```

### Run Production Server

```bash
pnpm run start
```

### Lint

```bash
pnpm run lint
```

### Test

```bash
pnpm run test
```

## Example Usage

### Shared Cluster Mode Example

```bash
# Create a Helm release
curl -X POST http://localhost:3000/api/v1/helm/ \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "my-app-instance",
    "teamId": "engineering",
    "appName": "frontend",
    "instanceConfig": {
      "repoUrl": "https://github.com/myorg/helm-charts.git",
      "targetRevision": "main",
      "path": "charts/webapp",
      "helmValues": {
        "replicaCount": 2,
        "image": {
          "tag": "v1.0.0"
        }
      }
    }
  }'

# List all releases
curl http://localhost:3000/api/v1/helm/ \
  -H "Authorization: Bearer your-token"

# Get specific release details
curl http://localhost:3000/api/v1/helm/?id=my-app-instance \
  -H "Authorization: Bearer your-token"

# Update a release
curl -X PATCH http://localhost:3000/api/v1/helm/my-app-instance \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceConfig": {
      "helmValues": {
        "replicaCount": 3
      }
    }
  }'

# Delete a release
curl -X DELETE http://localhost:3000/api/v1/helm/my-app-instance \
  -H "Authorization: Bearer your-token"
```

### Custom Cluster Mode Example

```bash
# Create a Helm release on a custom cluster
curl -X POST http://localhost:3000/api/v1/helm/ \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "customer-app",
    "instanceConfig": {
      "repoUrl": "https://github.com/myorg/helm-charts.git",
      "targetRevision": "main",
      "path": "charts/webapp",
      "kubeConfig": "/var/kubeconfigs/customer-123.yaml",
      "namespace": "production",
      "helmValues": {
        "replicaCount": 5
      }
    }
  }'
```

## Technology Stack

- **Node.js** with **TypeScript**
- **Express.js v5** - Web framework
- **Helm CLI** - Helm chart deployment
- **Kubernetes Client** (@kubernetes/client-node) - Kubernetes API interaction
- **Zod** - Schema validation
- **Vitest** - Testing framework
- **Morgan** - HTTP request logging
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing

## Security Considerations

- Always use HTTPS in production
- Store `API_TOKEN` securely (use environment variables, never commit to Git)
- Limit kubeconfig permissions to minimum required
- Use Service Accounts instead of user credentials for Kubernetes access
- Validate and sanitize all user inputs
- Consider implementing rate limiting for production deployments
- Regularly update dependencies for security patches

## License

MIT
