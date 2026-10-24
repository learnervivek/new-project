# AWS Deployment Guide for TripTally

This guide covers deploying TripTally on AWS with high reliability, performance, and security.

---

## 🏛️ Architecture Overview

TripTally consists of two independent tiers:
1. **Backend API (`server/`)**: Express.js REST API with MongoDB (Atlas) and Google Gemini AI.
2. **Frontend SPA (`client/`)**: React + Vite single-page application.

### Recommended AWS Architecture:
- **Backend**: **AWS App Runner** or **AWS EC2 / Elastic Container Service (ECS)** using the provided [server/Dockerfile](file:///Users/vivekkumar/TripTallyAI/server/Dockerfile).
- **Frontend**: **AWS S3 + CloudFront** or **AWS Amplify Hosting** for global CDN delivery and low latency.
- **Database**: **MongoDB Atlas** (hosted in the same AWS region for minimum latency).

---

## 1. Backend Deployment (AWS App Runner - Recommended)

AWS App Runner provides managed container hosting with auto-scaling, SSL, and load balancing without server management.

### Step 1: Connect Source Repository
1. Open the [AWS App Runner Console](https://console.aws.amazon.com/apprunner).
2. Click **Create service**.
3. Choose **Source code repository** and link your GitHub repository.
4. Set:
   - **Repository directory**: `server`
   - **Configuration file**: Configure all settings here
   - **Runtime**: `Nodejs 20` (or choose Docker using `server/Dockerfile`)
   - **Build command**: `npm install`
   - **Start command**: `npm start`
   - **Port**: `5001`

### Step 2: Configure Environment Variables
In App Runner service settings, add the following variables:

| Variable | Description | Example / Note |
|---|---|---|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Listening port | `5001` |
| `MONGODB_URI` | MongoDB Atlas Connection string | `mongodb+srv://user:pass@cluster.mongodb.net/triptally` |
| `JWT_SECRET` | Secret for auth tokens | 64-character random secure string |
| `CLIENT_URL` | Live frontend URL for CORS & cookies | `https://your-frontend.cloudfront.net` |
| `GEMINI_API_KEY` | Google Gemini AI API key | `AIzaSy...` |
| `GEMINI_MODEL` | Gemini AI model name | `gemini-3.1-flash-lite` |
| `RAZORPAY_KEY_ID` | (Optional) Payment gateway ID | `rzp_live_...` |
| `RAZORPAY_KEY_SECRET` | (Optional) Payment gateway secret | `...` |
| `SMTP_HOST` | (Optional) SMTP host for email invites | e.g., Amazon SES or Mailgun |
| `SMTP_PORT` | (Optional) SMTP port | `587` |
| `SMTP_USER` | (Optional) SMTP username | `...` |
| `SMTP_PASS` | (Optional) SMTP password | `...` |
| `EMAIL_FROM` | (Optional) Sender display email | `"TripTally" <noreply@yourdomain.com>` |
| `CLOUDINARY_CLOUD_NAME`| (Optional) For uploaded receipt/avatar hosting | `...` |
| `CLOUDINARY_API_KEY` | (Optional) | `...` |
| `CLOUDINARY_API_SECRET`| (Optional) | `...` |

### Step 3: MongoDB Atlas Network Access
In the MongoDB Atlas dashboard:
1. Navigate to **Network Access**.
2. If using App Runner without a VPC connector, add `0.0.0.0/0` (secured with strong MongoDB Atlas credentials).
3. If using an App Runner VPC connector, add your VPC CIDR or NAT Gateway elastic IP.

---

## 2. Frontend Deployment (AWS S3 + CloudFront or AWS Amplify)

### Option A: AWS Amplify Hosting (Fastest)
1. Open the [AWS Amplify Console](https://console.aws.amazon.com/amplify).
2. Click **Host web app** and connect your GitHub repo.
3. Configure build settings:
   - **App root**: `client`
   - **Build command**: `npm run build`
   - **Base directory**: `dist`
4. Set Environment Variable:
   - `VITE_API_URL`: Your backend App Runner URL with `/api` (e.g. `https://xxxx.awsapprunner.com/api`).
5. In **Rewrites and redirects**, ensure single-page app fallback is active:
   - Source: `</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>`
   - Target: `/index.html`
   - Status: `200 (Rewrite)`

### Option B: AWS S3 + CloudFront
1. Build client locally or in CI:
   ```bash
   cd client
   VITE_API_URL=https://<your-backend-domain>/api npm run build
   ```
2. Create an S3 bucket (e.g., `triptally-client-app`).
3. Upload contents of `client/dist/` to the S3 bucket.
4. Create a CloudFront Distribution pointing to your S3 bucket Origin Access Control (OAC).
5. In CloudFront **Error Pages**, set:
   - **HTTP Error Code**: `403` and `404`
   - **Response Page Path**: `/index.html`
   - **HTTP Response Code**: `200`
   (This allows client-side React Router routing to work seamlessly on browser reloads).

---

## 3. Alternative: Deploying on AWS EC2 with Docker

If you prefer deploying both tiers or the backend on a single EC2 instance:
1. Launch an Ubuntu 24.04 or Amazon Linux 2023 EC2 instance.
2. Install Docker:
   ```bash
   sudo apt-get update && sudo apt-get install -y docker.io docker-compose
   ```
3. Clone repository and set up environment:
   ```bash
   git clone <repo-url> /opt/triptally
   cd /opt/triptally/server
   cp .env.example .env
   # Edit .env with your production values
   ```
4. Build and run using the Dockerfile:
   ```bash
   docker build -t triptally-server .
   docker run -d --name triptally-api --restart always -p 5001:5001 --env-file .env triptally-server
   ```
5. Use Nginx or AWS Application Load Balancer (ALB) to handle SSL/TLS termination on port 443.
