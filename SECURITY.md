# Security Policy

## Supported Versions

This project currently supports the latest version on the `main` branch.

## Reporting a Vulnerability

Do not open public GitHub issues for security vulnerabilities.

Instead, report issues privately to the project owners with:

- a short description of the issue
- affected route, component, or API
- steps to reproduce
- impact assessment
- suggested fix if available

If you are reporting on behalf of a customer or deployment owner, include the affected environment and Azure subscription/resource group context when relevant.

Current owners:

- Supun Wijegunawardhana — `wgstpwijegunawardhana@gmail.com`
- Hirunika Withana — `hirunika.withana98@gmail.com`

## Response Expectations

The project owners will aim to:

- acknowledge the report
- validate the issue
- prepare a fix or mitigation
- coordinate disclosure when appropriate

## Scope

Examples of in-scope issues for this project:

- authentication or session bypass
- privilege escalation between candidate and admin flows
- CV or profile data exposure
- insecure Azure deployment defaults
- secrets handling issues

Out-of-scope items generally include:

- missing best-practice headers without exploit impact
- denial-of-service claims without a clear reproduction path
- issues in third-party services outside this repository
