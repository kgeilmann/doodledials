# SEA (Single Executable Application) Build

## Linux

```bash
pnpm build:sea
```

Produces `doodledials-server` in the project root. Run with `./doodledials-server`. The `build/` directory must be in the same folder as the binary.

## Windows

Requires a Windows machine. The SEA blob (`server/sea.blob`) is platform-independent.

1. Build the app and generate the blob:
   ```bash
   pnpm build
   pnpm build:sea:blob
   ```
2. Download `node.exe` (same version as your project's Node) from https://nodejs.org/dist/
3. Inject the blob:
   ```bash
   copy node.exe doodledials-server.exe
   npx postject doodledials-server.exe NODE_SEA_BLOB server/sea.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
   ```
4. Distribute `doodledials-server.exe` alongside the `build/` folder.
