## Lens Widgets React library

### Dependencies
These packages must be installed in the root React app
- react
- react-dom
- tailwindcss
- @tanstack/react-query@^4.22.0

With `@tanstack/react-query` you have to follow their [setup docs](https://github.com/TanStack/query/issues/3595#issuecomment-1353601727) - and if using Next.js check this [github issue](https://github.com/TanStack/query/issues/3595#issuecomment-1353601727) for webpack setup

### Installation

```sh
yarn install @madfi/widgets-react
```

### With Next.js

If you are using Next.js `pages` directory please update your `next.config.js` with the following:

```javascript
transpilePackages: ['@madfi/widgets-react'],
```

So the final configuration might look like this:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ['@madfi/widgets-react']
}
module.exports = nextConfig
```

Once this update is made, please re-run the server:
```sh
yarn watch:ts
```

### Local Development

1. Install deps
```sh
nvm use
pnpm install
```

2. Create a symlink in this directory
```sh
yarn link
```

3. Build the app in watch mode
```sh
yarn watch:ts
```

4. Install in your project + use the symlink
```sh
yarn install @madfi/widgets-react
yarn link "@madfi/widgets-react"
```

### With Next.js Dynamic Imports

Another option when working with Next.js `pages` directory apps is using a Dynamic Import:

```typescript
/* Profile created in separate component */
import {
  Profile
} from '@madfi/widgets-react'

export default function ProfileComponent() {
  return (
    <Profile handle='lens/madfinance' />
  )
}

/* ProfileComponent imported using a dynamic import */
import dynamic from 'next/dynamic'
const ProfileComponent = dynamic(() => import('../components/ProfileComponent'), { ssr: false })

export default () => {
  return (
    <div>
      <ProfileComponent />
    </div>
  )
}
```