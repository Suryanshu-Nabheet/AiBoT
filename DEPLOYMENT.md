# Deployment Guide for AiBoT

This guide will help you deploy AiBoT to various platforms.

## Prerequisites

- Git repository (GitHub, GitLab, etc.)
- OpenRouter API key
- Platform account (Vercel, Netlify, etc.)

## Environment Variables

All platforms require the following environment variable:

```
OPENROUTER_API_KEY=your_api_key_here
```

Optional variables:

```
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NEXT_PUBLIC_SITE_NAME=AiBoT
```

---

## Deploy to Vercel (Recommended)

Vercel is the creator of Next.js and offers the best integration.

### Option 1: One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Suryanshu-Nabheet/AiBoT)

### Option 2: Manual Deploy

1. **Push to GitHub**

   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repository

3. **Configure Environment**
   - Add `OPENROUTER_API_KEY` in Environment Variables
   - Click "Deploy"

4. **Done!**
   - Your site will be live at `your-project.vercel.app`

### Option 3: CLI Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

---

## Deploy to Netlify

1. **Build Configuration**
   Create `netlify.toml`:

   ```toml
   [build]
     command = "pnpm run build"
     publish = ".next"

   [[plugins]]
     package = "@netlify/plugin-nextjs"
   ```

2. **Deploy via UI**
   - Go to [netlify.com](https://netlify.com)
   - Import your repository
   - Add environment variables
   - Deploy

3. **Deploy via CLI**
   ```bash
   npm i -g netlify-cli
   netlify deploy --prod
   ```

---

## Deploy to Railway

1. **Create `railway.json`**

   ```json
   {
     "$schema": "https://railway.app/railway.schema.json",
     "build": {
       "builder": "NIXPACKS"
     },
     "deploy": {
       "startCommand": "pnpm start",
       "restartPolicyType": "ON_FAILURE",
       "restartPolicyMaxRetries": 10
     }
   }
   ```

2. **Deploy**
   - Go to [railway.app](https://railway.app)
   - New Project → Deploy from GitHub
   - Add environment variables
   - Deploy

---

## Deploy to Docker

1. **Create `Dockerfile`**

   ```dockerfile
   FROM node:18-alpine AS base

   # Install dependencies only when needed
   FROM base AS deps
   RUN apk add --no-cache libc6-compat
   WORKDIR /app

   COPY package.json pnpm-lock.yaml* ./
   RUN npm install -g pnpm && pnpm install --frozen-lockfile

   # Rebuild the source code only when needed
   FROM base AS builder
   WORKDIR /app
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .

   RUN npm install -g pnpm && pnpm run build

   # Production image
   FROM base AS runner
   WORKDIR /app

   ENV NODE_ENV production

   RUN addgroup --system --gid 1001 nodejs
   RUN adduser --system --uid 1001 nextjs

   COPY --from=builder /app/public ./public
   COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
   COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

   USER nextjs

   EXPOSE 3000

   ENV PORT 3000

   CMD ["node", "server.js"]
   ```

2. **Build and Run**
   ```bash
   docker build -t aibot .
   docker run -p 3000:3000 -e OPENROUTER_API_KEY=your_key aibot
   ```

---

## Deploy to Your Own Server

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Build
pnpm run build

# Start with PM2
pm2 start npm --name "aibot" -- start

# Save PM2 configuration
pm2 save
pm2 startup
```

### Using systemd

1. Create `/etc/systemd/system/aibot.service`:

   ```ini
   [Unit]
   Description=AiBoT
   After=network.target

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/var/www/aibot
   ExecStart=/usr/bin/npm start
   Restart=on-failure
   Environment=OPENROUTER_API_KEY=your_key

   [Install]
   WantedBy=multi-user.target
   ```

2. Enable and start:
   ```bash
   sudo systemctl enable aibot
   sudo systemctl start aibot
   ```

---

## Custom Domain

### Vercel

1. Go to Project Settings → Domains
2. Add your domain
3. Update DNS records as instructed

### Netlify

1. Go to Site Settings → Domain Management
2. Add custom domain
3. Configure DNS

---

## Performance Tips

1. **Enable caching**
   - Configure CDN (Vercel Edge Network / Cloudflare)
2. **Optimize images**
   - Already handled by Next.js Image component

3. **Monitor performance**
   - Use Vercel Analytics
   - Set up error tracking (Sentry)

4. **Enable compression**
   - Automatic on Vercel/Netlify

---

## Troubleshooting

### Build fails

- Check Node.js version (18+)
- Verify all dependencies are installed
- Check environment variables

### Runtime errors

- Check API key is set correctly
- Verify API endpoints are accessible
- Check logs: `vercel logs` or platform-specific command

### Performance issues

- Check bundle size: `pnpm run build`
- Enable production mode
- Use CDN for static assets

---

## Security Checklist

- ✅ API key stored in environment variables (not code)
- ✅ HTTPS enabled (automatic on Vercel/Netlify)
- ✅ Rate limiting configured
- ✅ CORS properly configured
- ✅ No sensitive data in client-side code

---

## Support

If you encounter issues:

1. Check the [GitHub Issues](https://github.com/Suryanshu-Nabheet/AiBoT/issues)
2. Review deployment logs
3. Open a new issue with details

Happy deploying! 🚀
