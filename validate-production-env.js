#!/usr/bin/env node

/**
 * Production Environment Validation Script
 * Validates critical environment variables for secure production deployment
 */

console.log('🔍 PRODUCTION ENVIRONMENT VALIDATION');
console.log('=====================================\n');

const errors = [];
const warnings = [];

// Check NODE_ENV
const nodeEnv = process.env.NODE_ENV;
console.log(`NODE_ENV: ${nodeEnv || 'NOT SET'}`);
if (nodeEnv !== 'production') {
  warnings.push('NODE_ENV is not set to "production"');
}

// CRITICAL: JWT_SECRET validation
const jwtSecret = process.env.JWT_SECRET;
console.log(`JWT_SECRET: ${jwtSecret ? '✓ SET (length: ' + jwtSecret.length + ')' : '❌ NOT SET'}`);
if (!jwtSecret) {
  errors.push('CRITICAL: JWT_SECRET is required in production');
} else if (jwtSecret.length < 32) {
  errors.push('CRITICAL: JWT_SECRET is too short (minimum 32 characters for production)');
} else if (jwtSecret === 'fallback-dev-secret-change-in-production') {
  errors.push('CRITICAL: JWT_SECRET is using default development value');
}

// Bot Token validation
const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
console.log(`TELEGRAM_BOT_TOKEN: ${botToken ? '✓ SET' : '❌ NOT SET'}`);
if (!botToken) {
  errors.push('CRITICAL: TELEGRAM_BOT_TOKEN is required');
}

// Database validation
const dbUrl = process.env.DATABASE_URL;
console.log(`DATABASE_URL: ${dbUrl ? '✓ SET' : '❌ NOT SET'}`);
if (!dbUrl) {
  errors.push('CRITICAL: DATABASE_URL is required');
}

// DEV_MODE should NOT be true in production
const devMode = process.env.DEV_MODE;
console.log(`DEV_MODE: ${devMode || 'NOT SET'}`);
if (devMode === 'true' && nodeEnv === 'production') {
  errors.push('CRITICAL: DEV_MODE must not be "true" in production (security risk)');
}

console.log('\n📋 VALIDATION RESULTS');
console.log('=====================');

if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ All checks passed! Environment is production-ready.');
} else {
  if (errors.length > 0) {
    console.log('\n❌ CRITICAL ERRORS (must fix before production):');
    errors.forEach((error, i) => console.log(`  ${i + 1}. ${error}`));
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    warnings.forEach((warning, i) => console.log(`  ${i + 1}. ${warning}`));
  }
  
  if (errors.length > 0) {
    console.log('\n🚫 PRODUCTION DEPLOYMENT BLOCKED');
    process.exit(1);
  }
}

console.log('\n🔒 Security Recommendations:');
console.log('- Ensure JWT_SECRET is randomly generated and secure');
console.log('- Never commit environment files or token files to git');
console.log('- Regularly rotate JWT secrets');
console.log('- Monitor for unauthorized access attempts');
console.log('- Use HTTPS in production');