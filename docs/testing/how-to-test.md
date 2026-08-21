1. Build iOS app first (once per native change):

```bash
pnpm e2e:build:ios
```

2. Add an attach config in VS Code (Run and Debug):

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Attach Detox iOS (9229)",
      "type": "node",
      "request": "attach",
      "port": 9229,
      "restart": true,
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

3. Start Detox in debug mode in terminal:

```bash
pnpm e2e:debug_test:ios -- --runInBand
```

`--runInBand` is important so Jest runs in one process and breakpoints hit reliably.

4. In VS Code, start the attach config `Attach Detox iOS (9229)`.

5. Press Continue (`F5`) once after attach.
   `--inspect-brk` pauses immediately at process start, so you must continue execution to reach your test breakpoints.

6. Put breakpoints in your e2e test files and step through normally.
