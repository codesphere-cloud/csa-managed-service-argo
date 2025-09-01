# CSA Demo: Managed Service Provider for Helm

## Requirements

### Add Service Account `kubeconfig`

To be able to access the K8s Cluster, we need a valid `kubeconfig`to access the Gardener project. Since a regular OIDC Brower Login Flow is not easily possible from within a Workspace, a Service Account should be created instead that use Token-based Auth. 

Steps: 
* Create a Service Account with `Admin` role via Gardener Dashboard
* Download the `kubeconfig` of the Service Account 

## API Endpoints

### Backend API (`/api`)

- `POST /api/shorten` - Create a shortened URL
  - Body: `{ "url": "https://example.com" }`
  - Returns: `{ "shortId": "abc1234", "shortUrl": "https://yourdomain.codesphere.com/abc1234", "originalUrl": "https://example.com" }`

- `GET /api/:shortId` - Redirect to original URL
  - Redirects with 302 status or returns 404 if not found

- `GET /api/qr/:shortId` - Generate QR code image
  - Returns PNG image of QR code for the shortened URL

- `GET /api/health` - Health check endpoint
- `GET /api/urls` - List all shortened URLs (debug endpoint)

### Frontend

- `GET /` - Main application interface
- `GET /:shortId` - Shortened URL redirects (forwards to `/api/:shortId`)

## Codesphere Deployment (Recommended)

This template is optimized for Codesphere deployment with multiple environment profiles:

### Quick Start
1. **Fork or clone** this repository
2. **Connect to Codesphere** and import your repository  
3. **Choose deployment profile:**
   - Use default `ci.yml` for basic deployment
   - Use `ci.dev.yml` for development environment
   - Use `ci.qa.yml` for testing environment  
   - Use `ci.prod.yml` for production environment

4. **Deploy and access:**
   - Your app will be available at `https://yourdomain.codesphere.com/`
   - Shortened URLs work automatically: `https://yourdomain.codesphere.com/abc1234`

### Environment Profiles

- **`ci.yml`** - Default configuration for basic deployment
- **`ci.dev.yml`** - Development environment with:
  - Smaller resource allocation (plan: 4)
  - Debug mode enabled
  - Development dependencies
  - Hot reloading with nodemon

- **`ci.qa.yml`** - QA/Testing environment with:
  - Medium resource allocation (plan: 8)
  - QA mode flags for debugging
  - Ready for test implementation

- **`ci.prod.yml`** - Production environment with:
  - Higher resource allocation (plan: 16)
  - Multiple replicas for high availability
  - Security audits during deployment
  - Production optimizations

The configuration automatically:
1. Installs dependencies for both services
2. Runs appropriate tests for the environment
3. Starts both frontend and backend services
4. Configures proper networking and routing

### Preview Deployments

This template includes CI/CD pipeline configurations for automatic preview deployments:

#### GitLab (`.gitlab-ci.yml`)
- **Triggers**: Merge request events
- **Features**: Automatic deploy and manual teardown
- **Environment**: `Preview Deployment NodeJS MR_$CI_MERGE_REQUEST_IID`

#### Bitbucket (`bitbucket-pipelines.yml`)
- **Triggers**: Pull request events
- **Features**: Automatic preview deployment
- **Plan**: Micro with on-demand scaling

#### GitHub (`.github/workflows/codesphere-deploy.yml`)
- **Triggers**: Pull request events and manual dispatch
- **Features**: Automatic deployment with proper permissions
- **Plan**: Micro with on-demand scaling

**Required Secrets/Variables:**
- `CODESPHERE_EMAIL` - Your Codesphere account email
- `CODESPHERE_PASSWORD` - Your Codesphere account password
- `CODESPHERE_TEAM` - Your Codesphere team name
- Additional platform-specific tokens as needed

## Usage

1. Open your Codesphere application URL
2. Enter a long URL in the input field
3. Click "Shorten URL"
4. Get your shortened URL and QR code
5. Share the shortened URL or scan the QR code

## Local Development (Optional)

For local development and testing:

### Prerequisites
- Node.js (v14 or higher)
- npm

### Setup
1. **Install dependencies:**
   ```bash
   cd backend && npm install
   cd frontend && npm install
   ```

2. **Start both services:**
   ```bash
   # Terminal 1 - Backend
   cd backend && npm start
   
   # Terminal 2 - Frontend  
   cd frontend && npm start
   ```

3. **Access locally:**
   - Frontend: http://localhost:3000
   - API: http://localhost:3000/api

Note: When running locally, shortened URLs will use localhost domains.

## Technologies Used

- **Backend**: Express.js, nanoid, qrcode, cors
- **Frontend**: Express.js, Static HTML
- **Styling**: Vanilla CSS with modern design
- **JavaScript**: ES6+ with async/await

## Configuration

### Environment Variables

- `PORT` - Server port (defaults to 3000, automatically configured by Codesphere)
- `WORKSPACE_DEV_DOMAIN` - Domain for shortened URLs (automatically set by Codesphere)

### Customization

- Modify QR code settings in `backend/index.js`
- Update UI styling in `frontend/public/index.html`
- Adjust API endpoints in frontend JavaScript
- Configure resource allocation in CI profile files

## License

MIT License
