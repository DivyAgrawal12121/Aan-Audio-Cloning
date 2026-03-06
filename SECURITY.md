# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Resound Studio, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, email the maintainers directly or use GitHub's private vulnerability reporting feature.

## Known Security Considerations

### `torch.load` with `weights_only=False`

Several engine files use `torch.load(..., weights_only=False)` to load voice embeddings. This allows arbitrary code execution via pickle deserialization.

**Risk:** If a user loads a malicious `.pt` voice file from an untrusted source, it could execute arbitrary code.

**Mitigation:**
- Resound Studio is a local-first application — all voice files are generated locally by default
- Do not load `.pt` files from untrusted sources
- We plan to migrate to `safetensors` format in a future release

### CORS Configuration

The backend allows CORS from `localhost:3000` and `127.0.0.1:3000`. This is safe for local development but should be restricted further if deployed to a network.

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x | ✅ |
