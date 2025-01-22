# PocketTypes

Generate TypeScript types from your PocketBase collections in seconds.

## Install

```bash
bun add pockettypes
```

## Usage

1. Create a `.pocketbase.config.ts` file:

```ts
export default {
  url: 'https://your-pb-instance.com',
  username: 'admin@example.com', 
  password: 'your-password'
}
```

2. Generate types:

```bash
bun generate
```

This creates `pb.types.ts` with interfaces for all your collections:

```ts
interface Base {
  id: string;
  created: string;
  updated: string;
}

interface User extends Base {
  name: string;
  avatar: string;
  post_id: string; 
}

interface Post extends Base {
  title: string;
  content: string;
  author_id: string
}
```

## Features

- Generates TypeScript interfaces from PocketBase collections
- Handles relations with proper typing
- Supports all PocketBase field types
- Generates expand interfaces for relations
- Excludes views by default
- Adds proper nullability
- Supports custom fields

## License

MIT © [thisuxhq](https://github.com/thisuxhq)
