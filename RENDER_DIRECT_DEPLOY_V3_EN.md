# Direct Deployment Guide for Render.com - Version 3 (Updated)

## Zip File Contents

The updated deployment package `butterbakery-render-deployment-v3.zip` has been reorganized with the correct file structure for deployment on Render.com. The zip file contains:

- All essential project files at the root level (`package.json`, `start.js`, `render.yaml`)
- All necessary directories and files for the application (`client`, `server`, `shared`, `public`)
- Additional configuration files for application stability (`.npmrc`, `tsconfig.json`)
- Components required for database communication

## Deployment Methods on Render.com

### Method 1: Direct Deployment Using render.yaml (Recommended)

1. **Create a New Project**:
   - Log in to your Render.com account
   - Click on "New +" then select "Blueprint"

2. **Configure the Project**:
   - Choose "Upload YAML file"
   - Upload the `render.yaml` file included in the deployment package
   - Click on "Apply"

3. **Wait for Resource Initialization**:
   - Render.com will automatically create a database and web service
   - Wait until the setup is complete (may take 5-10 minutes)

4. **Upload Application Files**:
   - After resource creation is complete, navigate to the created web service
   - Click on "Manual Deploy" then "Upload Files"
   - Upload the project files (you can extract the zip file and upload the files directly)

### Method 2: Traditional Manual Deployment

1. **Create a Database**:
   - Click on "New +" then select "PostgreSQL"
   - Complete the database setup and save the connection information

2. **Create a New Service**:
   - Click on "New +" then select "Web Service"
   - On the configuration page, choose "Upload Files"
   - Upload the `butterbakery-render-deployment-v3.zip` file

3. **Configure Deployment Settings**:
   - **Name**: Choose a name for your service (e.g., `butterbakery-op`)
   - **Region**: Select the region closest to your users (same as your database region)
   - **Runtime**: Select `Node`
   - **Node Version**: `20.x`
   - **Build Command**: `npm install`
   - **Start Command**: `node start.js`

4. **Set Up Environment Variables**:
   - Under the "Environment Variables" section, add the following variables:
     - `NODE_ENV`: `production`
     - `PORT`: `10000`
     - `DATABASE_URL`: Your PostgreSQL database connection URL
     - `SESSION_SECRET`: A long random value (e.g., `butterbakery-session-secret-key-123`)
     - `TZ`: `Asia/Riyadh` (appropriate timezone for Saudi Arabia)
     - `NODE_OPTIONS`: `--max-old-space-size=512`

5. **Advanced Options**:
   - Enable "Health Check Path" and set it to `/health`
   - Set "Auto-Deploy" to "No" for controlled deployment

## Direct Deployment Using Script (For Developers)

If you want to deploy directly using the API, you can use the included script:

1. Download `render-direct-deploy.sh` from the deployment package
2. Provide your Render API Key as an environment variable:
   ```
   export RENDER_API_KEY=your_api_key_here
   ```
3. Execute the script:
   ```
   bash render-direct-deploy.sh
   ```

The script will automatically create a database and web service, and deploy the application.

## Verifying Successful Deployment

After the deployment process is complete, you'll be able to access your application via the URL provided by Render.com. You can log in using:

- Username: `admin`
- Password: `admin`

**Security Alert**: Change the default password after logging in for the first time.

## Troubleshooting

If you encounter any issues during deployment, try the following steps:

1. **Check Application Logs**:
   - Go to your service page
   - Click on the "Logs" tab
   - Look for any clear error messages

2. **Common Issues and Solutions**:
   - **MODULE_NOT_FOUND Error**: Ensure the `npm install` process completed correctly
   - **Database Connection Error**: Verify the `DATABASE_URL` environment variable is correct
   - **Service Timeout Issues**: Increase the `NODE_OPTIONS` value to allocate more memory
   - **Arabic Rendering Problems**: Make sure `TZ` is set correctly

3. **Redeployment**:
   - Try clicking on "Manual Deploy" then "Clear Build Cache & Deploy"
   - This will reload all dependencies from scratch

## Getting Support

If you need additional assistance, you can contact the support team via:

- Email: support@company.com
- Phone: +123456789