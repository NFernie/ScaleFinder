/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** MapTiler API key. When absent, the app falls back to keyless OpenFreeMap. */
  readonly VITE_MAPTILER_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
