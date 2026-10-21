# Deployment Guide

Excel Toolkit is a static single-page application (SPA). It can be deployed to any static web host, CDN, or internal enterprise intranet without requiring application servers or databases.

## Recommended Hosting Providers

### GitHub Pages
1. Build the production assets:
   ```bash
   npm run build
   ```
2. The compiled static output in `dist/` can be served directly from GitHub Pages or via a GitHub Actions workflow.

### Cloudflare Pages / Vercel / Netlify
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Node Version**: 18+

### Docker / Nginx
```dockerfile
FROM nginx:alpine
COPY dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```
