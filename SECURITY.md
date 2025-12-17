# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in AiBoT, please report it responsibly:

**Email:** suryanshunab@gmail.com
**Subject:** [SECURITY] AiBoT Vulnerability Report

Please include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will respond within 48 hours and work to address the issue promptly.

## Security Best Practices

### API Key Protection

**CRITICAL:** Never commit API keys to version control.

1. **Environment Variables:**

   ```env
   OPENROUTER_API_KEY=your_key_here
   ```

2. **Never hardcode keys** in source code
3. **Use `.env.local`** for local development (gitignored)
4. **Rotate keys** if exposed

### Deployment Security

1. **HTTPS Only:** Always deploy with SSL/TLS
2. **Environment Variables:** Use platform-specific secret management
3. **CORS:** Configure appropriate CORS policies
4. **Rate Limiting:** Implement rate limiting on API routes
5. **Input Validation:** All user inputs are validated

### Code Security

- **XSS Prevention:** All user content is sanitized
- **Iframe Sandboxing:** Generated code runs in sandboxed iframes
- **CSP Headers:** Content Security Policy configured
- **Dependency Audits:** Regular `npm audit` checks

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Security Features

### Built-in Protection

1. **API Key Validation:** Server-side validation of API keys
2. **Sanitized Outputs:** All AI-generated content is sanitized
3. **Sandboxed Execution:** Code preview runs in isolated iframe
4. **Session Management:** Secure session handling
5. **Error Handling:** No sensitive data in error messages

### User Responsibilities

1. **Protect API Keys:** Keep your OpenRouter API key secure
2. **Review Generated Code:** Always review AI-generated code before deployment
3. **Update Dependencies:** Keep dependencies up to date
4. **Monitor Usage:** Monitor API usage and costs

## Compliance

- **GDPR:** No personal data stored without consent
- **Data Privacy:** Chat history stored locally (sessionStorage)
- **API Usage:** Complies with OpenRouter terms of service

## Contact

For security concerns: suryanshu.nabheet@example.com

---

**Last Updated:** December 2025  
**Maintained by:** Suryanshu Nabheet
