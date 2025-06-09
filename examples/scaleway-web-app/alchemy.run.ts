#!/usr/bin/env -S npx tsx

import {
  ScalewayInstance,
  ScalewayBucket,
  ScalewaySecurityGroup,
} from "alchemy/scaleway";

console.log("🚀 Deploying Scaleway Web Application Infrastructure...\n");

// Create a security group for web servers
const webSg = await ScalewaySecurityGroup("web-security-group", {
  name: "scaleway-web-app-sg",
  description: "Security group for Scaleway web application demo",
  zone: "fr-par-1",
  rules: [
    {
      // SSH access for administration
      direction: "inbound",
      action: "accept",
      protocol: "TCP",
      dest_port_from: 22,
      dest_port_to: 22,
      ip_range: "0.0.0.0/0",
    },
    {
      // HTTP access for web traffic
      direction: "inbound",
      action: "accept",
      protocol: "TCP",
      dest_port_from: 80,
      dest_port_to: 80,
      ip_range: "0.0.0.0/0",
    },
    {
      // HTTPS access for secure web traffic
      direction: "inbound",
      action: "accept",
      protocol: "TCP",
      dest_port_from: 443,
      dest_port_to: 443,
      ip_range: "0.0.0.0/0",
    },
    {
      // Custom application port
      direction: "inbound",
      action: "accept",
      protocol: "TCP",
      dest_port_from: 3000,
      dest_port_to: 3000,
      ip_range: "0.0.0.0/0",
    },
  ],
  tags: ["web", "demo", "alchemy"],
});

console.log(`✅ Security Group: ${webSg.name} (${webSg.id})`);

// Create a web server instance
const webServer = await ScalewayInstance("web-server", {
  name: "scaleway-web-app-server",
  type: "DEV1-M", // 2 vCPU, 4GB RAM - good for demo applications
  zone: "fr-par-1",
  image: "ubuntu_jammy", // Ubuntu 22.04 LTS
  root_volume_size: 30, // 30GB SSD for application and dependencies
  root_volume_type: "l_ssd", // Local SSD for better performance
  security_groups: [webSg.id],
  tags: ["web", "demo", "alchemy"],
  start_on_create: true,
});

console.log(`✅ Web Server: ${webServer.name}`);
console.log(`   Public IP: ${webServer.public_ip?.address}`);
console.log(`   Private IP: ${webServer.private_ip}`);
console.log(`   State: ${webServer.state}`);

// Create a public bucket for static assets (CSS, JS, images)
const staticBucket = await ScalewayBucket("static-assets", {
  name: `scaleway-demo-static-${Date.now()}`, // Must be globally unique
  region: "fr-par",
  visibility: "public-read",
  versioning: false, // Not needed for static assets
  tags: {
    purpose: "static-assets",
    application: "scaleway-web-app",
    environment: "demo",
  },
});

console.log(`✅ Static Assets Bucket: ${staticBucket.name}`);
console.log(`   Endpoint: ${staticBucket.endpoint}`);
console.log(`   Public URL: https://${staticBucket.name}.s3.fr-par.scw.cloud/`);

// Create a private bucket for application data and uploads
const dataBucket = await ScalewayBucket("app-data", {
  name: `scaleway-demo-data-${Date.now()}`, // Must be globally unique
  region: "fr-par",
  visibility: "private",
  versioning: true, // Enable versioning for data protection
  tags: {
    purpose: "application-data",
    application: "scaleway-web-app",
    environment: "demo",
  },
});

console.log(`✅ Application Data Bucket: ${dataBucket.name}`);
console.log(`   Versioning: ${dataBucket.versioning ? "Enabled" : "Disabled"}`);

// Create a backup bucket in a different region for disaster recovery
const backupBucket = await ScalewayBucket("backup-storage", {
  name: `scaleway-demo-backup-${Date.now()}`, // Must be globally unique
  region: "nl-ams", // Different region for geographic redundancy
  visibility: "private",
  versioning: true,
  tags: {
    purpose: "backup",
    application: "scaleway-web-app",
    environment: "demo",
  },
});

console.log(`✅ Backup Bucket: ${backupBucket.name} (${backupBucket.region})`);

// Display deployment summary
console.log(
  "\n🎉 Scaleway Web Application Infrastructure Deployed Successfully!\n",
);

console.log("📊 Infrastructure Summary:");
console.log("┌─────────────────────────────────────────────────────────────┐");
console.log("│ COMPUTE                                                     │");
console.log("├─────────────────────────────────────────────────────────────┤");
console.log(`│ Web Server:    ${webServer.name.padEnd(20)} │`);
console.log(`│ Instance Type: ${webServer.type.padEnd(20)} │`);
console.log(`│ Zone:          ${webServer.zone.padEnd(20)} │`);
console.log(
  `│ Public IP:     ${(webServer.public_ip?.address || "N/A").padEnd(20)} │`,
);
console.log("├─────────────────────────────────────────────────────────────┤");
console.log("│ STORAGE                                                     │");
console.log("├─────────────────────────────────────────────────────────────┤");
console.log(
  `│ Static Assets: ${staticBucket.name.substring(0, 30).padEnd(30)} │`,
);
console.log(
  `│ App Data:      ${dataBucket.name.substring(0, 30).padEnd(30)} │`,
);
console.log(
  `│ Backup:        ${backupBucket.name.substring(0, 30).padEnd(30)} │`,
);
console.log("├─────────────────────────────────────────────────────────────┤");
console.log("│ SECURITY                                                    │");
console.log("├─────────────────────────────────────────────────────────────┤");
console.log(`│ Security Group: ${webSg.name.padEnd(35)} │`);
console.log(
  `│ Rules:          ${webSg.rules.length} rules (SSH, HTTP, HTTPS, App)      │`,
);
console.log("└─────────────────────────────────────────────────────────────┘");

console.log("\n🚀 Next Steps:");
console.log("1. SSH to your server:");
console.log(`   ssh root@${webServer.public_ip?.address}`);
console.log("");
console.log("2. Install and configure your web application:");
console.log("   apt update && apt install -y nginx nodejs npm");
console.log("");
console.log("3. Upload static files to your bucket:");
console.log(`   Bucket: ${staticBucket.name}`);
console.log(`   Endpoint: ${staticBucket.endpoint}`);
console.log("");
console.log("4. Access your static files at:");
console.log(`   https://${staticBucket.name}.s3.fr-par.scw.cloud/filename`);
console.log("");
console.log("5. Test your web server:");
console.log(`   http://${webServer.public_ip?.address}`);
console.log("");
console.log(
  "💡 Tip: Check the Scaleway console for additional configuration options",
);
console.log("🗑️  To destroy this infrastructure, run: npm run destroy");
