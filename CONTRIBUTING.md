# Contributing

Thanks for contributing to this project.

## Development Setup

1. Install dependencies:

```bash
npm install
```

2. Create a local environment file:

```bash
cp .env.example .env.local
```

3. Start the app:

```bash
npm run dev
```

For the multi-tenant dev stack:

```bash
npm run dev:mt-dev
```

## Before Opening a Pull Request

Run:

```bash
npm run lint
npm run build
```

## Contribution Guidelines

- Keep changes focused and scoped to the task.
- Preserve the current Azure deployment model unless the change explicitly targets infrastructure.
- Do not commit secrets, connection strings, or private keys.
- For auth, admin, CV access, or storage changes, prefer server-side enforcement over UI-only protection.
- Update documentation when the deployment flow, environment variables, or operational behavior changes.
- Add or update changelog entries for notable user-facing or operational changes.

## Pull Requests

When opening a pull request, include:

- what changed
- why it changed
- how it was tested
- any Azure or GitHub secret changes required

## Infrastructure Changes

For Azure changes:

- prefer Bicep updates in `infra/`
- keep defaults cost-aware
- document any new required parameters or secrets in `README.md` and `infra/README.md`
