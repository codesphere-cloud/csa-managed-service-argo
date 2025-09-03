# CSA Demo: Managed Service Provider K8s

## Requirements

### Add Service Account `kubeconfig`

To be able to access the K8s Cluster, we need a valid `kubeconfig`to access the Gardener project. Since a regular OIDC Brower Login Flow is not easily possible from within a Workspace, a Service Account should be created instead that use Token-based Auth. 

Steps: 
* Create a Service Account with `Admin` role via Gardener Dashboard
* Download the `kubeconfig` of the Service Account

-------------------------

# Express API Starter with Typescript

A JavaScript Express v5 starter template with sensible defaults.

How to use this template:

```sh
pnpm dlx create-express-api@latest --typescript --directory my-api-name
```

Includes API Server utilities:

- [morgan](https://www.npmjs.com/package/morgan)
  - HTTP request logger middleware for node.js
- [helmet](https://www.npmjs.com/package/helmet)
  - Helmet helps you secure your Express apps by setting various HTTP headers. It's not a silver bullet, but it can help!
- [cors](https://www.npmjs.com/package/cors)
  - CORS is a node.js package for providing a Connect/Express middleware that can be used to enable CORS with various options.

Development utilities:

- [typescript](https://www.npmjs.com/package/typescript)
  - TypeScript is a language for application-scale JavaScript.
- [tsx](https://www.npmjs.com/package/tsx)
  - The easiest way to run TypeScript in Node.js
- [eslint](https://www.npmjs.com/package/eslint)
  - ESLint is a tool for identifying and reporting on patterns found in ECMAScript/JavaScript code.
- [vitest](https://www.npmjs.com/package/vitest)
  - Next generation testing framework powered by Vite.
- [zod](https://www.npmjs.com/package/zod)
  - Validated TypeSafe env with zod schema
- [supertest](https://www.npmjs.com/package/supertest)
  - HTTP assertions made easy via superagent.

## Setup

```
pnpm install
```

## Lint

```
pnpm run lint
```

## Test

```
pnpm run test
```

## Development

```
pnpm run dev
```