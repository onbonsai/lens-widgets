## Lens Widgets React library (MadFi Fork)

### Dependencies
These packages must be installed in the root React app
- react
- tailwindcss

### Installation

```sh
yarn install @mad-finance/widgets-react
```
or

```sh
npm install @mad-finance/widgets-react
```

### With Next.js

If you are using Next.js `pages` directory please update your `next.config.js` with the following:

```javascript
transpilePackages: ['@mad-finance/widgets-react'],
```

So the final configuration might look like this:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ['@mad-finance/widgets-react']
}
module.exports = nextConfig
```

Once this update is made, please re-run the server:

```sh
yarn watch:ts
```
or
```sh
npm run watch:ts
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
yarn install @mad-finance/widgets-react
yarn link "@mad-finance/widgets-react"
```

### With Next.js Dynamic Imports

Another option when working with Next.js `pages` directory apps is using a Dynamic Import:

```typescript
/* Profile created in separate component */
import {
  Profile
} from '@mad-finance/widgets-react'

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