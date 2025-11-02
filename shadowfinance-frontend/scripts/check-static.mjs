import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const errors = [];

// Check for SSR/ISR/Edge/API Route violations
function checkForViolations(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const fullPath = path.join(dir, file.name);

    if (file.isDirectory()) {
      // Check for dynamic routes without generateStaticParams
      if (file.name.startsWith('[') && file.name.endsWith(']')) {
        const paramsFile = path.join(fullPath, 'generateStaticParams.ts');
        const paramsFileTsx = path.join(fullPath, 'generateStaticParams.tsx');
        if (!fs.existsSync(paramsFile) && !fs.existsSync(paramsFileTsx)) {
          errors.push(`Dynamic route ${fullPath} missing generateStaticParams`);
        }
      }
      
      // Skip node_modules and .next
      if (file.name !== 'node_modules' && file.name !== '.next' && file.name !== 'out') {
        checkForViolations(fullPath);
      }
    } else if (file.isFile()) {
      // Check file content for violations
      if (file.name.endsWith('.ts') || file.name.endsWith('.tsx')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        
        // Check for SSR/ISR
        if (content.includes('getServerSideProps') || content.includes('getStaticProps')) {
          errors.push(`${fullPath} uses SSR/ISR (not allowed in static export)`);
        }
        
        // Check for API routes
        if (fullPath.includes('/api/') || fullPath.includes('\\api\\')) {
          errors.push(`${fullPath} is an API route (not allowed in static export)`);
        }
        
        // Check for server-only imports
        if (content.includes("from 'server-only'") || content.includes('from "server-only"')) {
          errors.push(`${fullPath} imports server-only (not allowed in static export)`);
        }
        
        // Check for next/headers
        if (content.includes("from 'next/headers'") || content.includes('from "next/headers"')) {
          errors.push(`${fullPath} uses next/headers (not allowed in static export)`);
        }
        
        // Check for cookies()
        if (content.includes('cookies()') && !content.includes('//')) {
          errors.push(`${fullPath} uses cookies() (not allowed in static export)`);
        }
      }
    }
  }
}

// Check next.config.ts
const configPath = path.join(process.cwd(), 'next.config.ts');
if (fs.existsSync(configPath)) {
  const config = fs.readFileSync(configPath, 'utf-8');
  if (!config.includes("output: 'export'") && !config.includes('output: "export"')) {
    errors.push('next.config.ts missing output: "export"');
  }
  if (!config.includes('images.unoptimized') && !config.includes('unoptimized: true')) {
    errors.push('next.config.ts missing images.unoptimized: true');
  }
  if (!config.includes('trailingSlash')) {
    errors.push('next.config.ts missing trailingSlash: true');
  }
}

// Check app directory
const appDir = path.join(process.cwd(), 'app');
if (fs.existsSync(appDir)) {
  checkForViolations(appDir);
}

// Check pages directory (if exists)
const pagesDir = path.join(process.cwd(), 'pages');
if (fs.existsSync(pagesDir)) {
  checkForViolations(pagesDir);
}

// Report results
if (errors.length > 0) {
  console.error('\n❌ Static export check failed!\n');
  errors.forEach(err => console.error(`  - ${err}`));
  console.error('\n');
  process.exit(1);
} else {
  console.log('✅ Static export check passed!');
}

