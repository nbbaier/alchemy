# Scaleway Web Application Example

This example demonstrates how to use Alchemy to deploy a complete web application infrastructure on Scaleway, including compute instances, object storage, and security configurations.

## What This Example Creates

- **Web Server**: Ubuntu instance with 2 vCPU, 4GB RAM in Paris (fr-par-1)
- **Static Assets Bucket**: Public S3-compatible storage for CSS, JS, images
- **Application Data Bucket**: Private storage with versioning for user data
- **Backup Bucket**: Private storage in Amsterdam for disaster recovery
- **Security Group**: Firewall rules allowing SSH, HTTP, HTTPS, and custom app access

## Prerequisites

1. **Scaleway Account**: Sign up at [console.scaleway.com](https://console.scaleway.com/register)

2. **API Credentials**: Create API keys in the Scaleway console:
   - Go to **Credentials** → **API Keys** 
   - Generate new API key
   - Copy Access Key, Secret Key, and Project ID

3. **Environment Variables**: Set in your `.env` file:
   ```env
   SCALEWAY_ACCESS_KEY=your-access-key
   SCALEWAY_SECRET_KEY=your-secret-key
   SCALEWAY_PROJECT_ID=your-project-id
   ```

## Quick Start

1. **Install dependencies**:
   ```sh
   npm install
   ```

2. **Deploy infrastructure**:
   ```sh
   npm run deploy
   ```

3. **Access your server**:
   ```sh
   ssh root@<PUBLIC_IP>
   ```

4. **Clean up when done**:
   ```sh
   npm run destroy
   ```

## Infrastructure Details

### Compute
- **Instance Type**: DEV1-M (2 vCPU, 4GB RAM)
- **Operating System**: Ubuntu 22.04 LTS
- **Storage**: 30GB Local SSD
- **Location**: Paris, France (fr-par-1)
- **Networking**: Public IPv4, Private network access

### Storage
- **Static Assets**: Public bucket for website files
- **Application Data**: Private bucket with versioning
- **Backup Storage**: Private bucket in Amsterdam region
- **S3 Compatibility**: Use standard AWS SDK tools

### Security
- **Firewall Rules**:
  - SSH (port 22): Administrative access
  - HTTP (port 80): Web traffic
  - HTTPS (port 443): Secure web traffic  
  - Custom (port 3000): Application server
- **Network Access**: Configurable IP ranges per rule

## Usage Examples

### Setting Up a Node.js Application

SSH to your server and set up a Node.js web application:

```bash
# SSH to the server
ssh root@<PUBLIC_IP>

# Update system packages
apt update && apt upgrade -y

# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs nginx

# Create a simple web application
mkdir /var/www/app && cd /var/www/app

# Create package.json
cat > package.json << 'EOF'
{
  "name": "scaleway-demo-app",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.0"
  }
}
EOF

# Install dependencies
npm install

# Create a simple Express server
cat > server.js << 'EOF'
const express = require('express');
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  res.json({
    message: 'Hello from Scaleway!',
    server: 'Node.js Express',
    infrastructure: 'Managed by Alchemy',
    region: 'France (Paris)',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
EOF

# Start the application
node server.js &

# Configure nginx as reverse proxy
cat > /etc/nginx/sites-available/default << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Restart nginx
systemctl restart nginx
systemctl enable nginx
```

### Using Object Storage

Upload files to your Scaleway buckets using the AWS SDK:

```javascript
// upload-example.js
const AWS = require('aws-sdk');
const fs = require('fs');

const s3 = new AWS.S3({
  endpoint: 'https://s3.fr-par.scw.cloud',
  accessKeyId: process.env.SCALEWAY_ACCESS_KEY,
  secretAccessKey: process.env.SCALEWAY_SECRET_KEY,
  region: 'fr-par',
  s3ForcePathStyle: true
});

// Upload to static assets bucket (public)
async function uploadStaticFile() {
  const params = {
    Bucket: 'your-static-bucket-name',
    Key: 'css/style.css',
    Body: fs.createReadStream('./style.css'),
    ContentType: 'text/css',
    ACL: 'public-read'
  };

  const result = await s3.upload(params).promise();
  console.log('Static file uploaded:', result.Location);
}

// Upload to private data bucket
async function uploadUserData() {
  const params = {
    Bucket: 'your-data-bucket-name',
    Key: `users/${userId}/profile.json`,
    Body: JSON.stringify(userData),
    ContentType: 'application/json'
  };

  const result = await s3.upload(params).promise();
  console.log('User data uploaded:', result.Key);
}
```

## Cost Optimization

This example is designed for learning and development. For production:

1. **Right-size instances**: Start with smaller instances and scale up
2. **Use appropriate storage classes**: Consider Glacier for archival
3. **Monitor usage**: Set up billing alerts and usage monitoring
4. **Regional selection**: Choose regions close to your users
5. **Reserved instances**: Consider reservations for predictable workloads

## Security Considerations

- **SSH Key Management**: Use SSH keys instead of passwords
- **Security Group Rules**: Restrict IP ranges to known sources
- **Regular Updates**: Keep the OS and applications updated
- **Backup Strategy**: Implement automated backups
- **Access Control**: Use IAM for fine-grained permissions

## Monitoring and Observability

Set up monitoring for your infrastructure:

```bash
# Install monitoring tools
apt install -y htop iotop nethogs

# Monitor system resources
htop              # CPU and memory usage
iotop             # Disk I/O
nethogs           # Network usage per process

# Check application logs
journalctl -u nginx -f    # Nginx logs
pm2 logs                  # Application logs (if using PM2)
```

## Scaling Considerations

As your application grows:

1. **Load Balancing**: Add multiple instances behind a load balancer
2. **Database**: Implement managed PostgreSQL or MySQL
3. **CDN**: Use object storage with CDN for global distribution
4. **Auto Scaling**: Implement automatic scaling based on metrics
5. **Microservices**: Split monolithic applications into services

## Troubleshooting

Common issues and solutions:

### Instance Won't Start
- Check security group rules
- Verify image compatibility
- Review instance logs in Scaleway console

### Storage Access Issues
- Verify bucket permissions
- Check access keys and project ID
- Ensure correct endpoint URL

### Network Connectivity
- Verify security group allows required ports
- Check if services are bound to correct interfaces
- Test with curl or wget from the instance

## Support

- [Scaleway Documentation](https://www.scaleway.com/en/docs/)
- [Alchemy Documentation](https://alchemy.run)
- [Scaleway Community](https://www.scaleway.com/en/community/)

This example provides a solid foundation for building scalable web applications on Scaleway using Alchemy's infrastructure-as-code approach.