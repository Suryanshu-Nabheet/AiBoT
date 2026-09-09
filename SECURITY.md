# Security Policy

## <kbd>REPORTING A VULNERABILITY</kbd>

If you discover a security vulnerability in AiBoT, please report it responsibly:

**Email:** suryanshunab@gmail.com
**Subject:** [SECURITY] AiBoT Vulnerability Report

Please include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will respond within 48 hours and work to address the issue promptly.

## <kbd>SECURITY BEST PRACTICES</kbd>

### <kbd>API KEY PROTECTION</kbd>

**CRITICAL:** Never commit API keys to version control.

1. **Environment Variables:**

   ```env
   OPENROUTER_API_KEY=your_key_here
   ```

2. **Never hardcode keys** in source code
3. **Use `.env.local`** for local development (gitignored)
4. **Rotate keys** if exposed

### <kbd>DEPLOYMENT SECURITY</kbd>

1. **HTTPS Only:** Always deploy with SSL/TLS
2. **Environment Variables:** Use platform-specific secret management
3. **CORS:** Requests with a cross-origin browser `Origin` are rejected.
4. **Rate Limiting:** API routes have per-instance, IP-based limits. Use a shared store such as Redis for production deployments that scale horizontally.
5. **Input Validation:** API request bodies are schema-validated and size-limited.

### <kbd>CODE SECURITY</kbd>

- **XSS Prevention:** All user content is sanitized
- **Iframe Sandboxing:** Generated preview code runs in an opaque-origin sandbox.
- **CSP Headers:** Content Security Policy and browser hardening headers are configured.
- **Dependency Audits:** Run `pnpm audit` as part of release preparation.

## <kbd>SUPPORTED VERSIONS</kbd>

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | YES |
| < 1.0   | NO  |

## <kbd>SECURITY FEATURES</kbd>

### <kbd>BUILT-IN PROTECTION</kbd>

1. **API Key Validation:** Server-side format validation and provider verification.
2. **Sanitized Outputs:** All AI-generated content is sanitized
3. **Sandboxed Execution:** Code preview runs in isolated iframe
4. **Session Management:** Secure session handling
5. **Error Handling:** No sensitive data in error messages

### <kbd>USER RESPONSIBILITIES</kbd>

1. **Protect API Keys:** Keep your OpenRouter API key secure
2. **Review Generated Code:** Always review AI-generated code before deployment
3. **Update Dependencies:** Keep dependencies up to date
4. **Monitor Usage:** Monitor API usage and costs

## <kbd>COMPLIANCE</kbd>

- **GDPR:** No personal data stored without consent
- **Data Privacy:** Chat history stored locally (sessionStorage)
- **API Usage:** Complies with OpenRouter terms of service

## <kbd>CONTACT</kbd>

For security concerns: suryanshu.nabheet@example.com

---

**Last Updated:** May 2026  
**Maintained by:** Suryanshu Nabheet
