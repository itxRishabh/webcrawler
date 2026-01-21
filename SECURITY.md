# Security Policy

## Reporting Security Vulnerabilities

If you discover a security vulnerability in this project, please report it responsibly.

## Built-in Security Features

This tool includes multiple security features to prevent abuse:

### 1. SSRF (Server-Side Request Forgery) Protection
- Blocks requests to internal/private IP ranges (10.x.x.x, 192.168.x.x, 172.16.x.x, etc.)
- Blocks localhost and loopback addresses
- Blocks cloud metadata endpoints (169.254.169.254, etc.)
- DNS rebinding prevention

### 2. Rate Limiting
- Per-user request throttling to prevent abuse
- Configurable rate limits via environment variables

### 3. Input Validation
- All user inputs are validated using Zod schemas
- URL validation to ensure only HTTP/HTTPS protocols
- Path traversal prevention

### 4. Resource Limits
- Maximum pages per job
- Maximum file size limits
- Maximum total job size limits
- Maximum crawl depth

### 5. robots.txt Support
- Option to respect robots.txt directives
- Polite crawling with configurable delays

## Responsible Use

This tool should only be used for legitimate purposes. Users must ensure compliance with:
- Target website's Terms of Service
- Copyright and intellectual property laws
- All applicable local and international laws

**The developers are not responsible for any misuse of this software.**
