import http from 'http'

interface ShimResponse {
  ok: boolean
  status: number
  statusText: string
  json: () => Promise<any>
  text: () => Promise<string>
}

let originalFetch: typeof fetch

// jest-expo's test environment stubs out React Native's fetch (there's no native
// bridge in a Jest process, so it never touches the network) — real Node fetch
// isn't reachable from inside the test either, since jest-expo's setup replaces
// the global before this file runs. This is a plain Node `http` shim that's just
// enough to exercise a real HTTP round trip against the mock server.
function nodeFetchShim(url: string): Promise<ShimResponse> {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          const status = res.statusCode ?? 0
          resolve({
            ok: status >= 200 && status < 300,
            status,
            statusText: res.statusMessage ?? '',
            json: async () => JSON.parse(data),
            text: async () => data,
          })
        })
      })
      .on('error', reject)
  })
}

export function addFetchShim(): void {
  originalFetch = globalThis.fetch
  globalThis.fetch = nodeFetchShim as unknown as typeof fetch
}
export function removeFetchShim() {
  globalThis.fetch = originalFetch
}
