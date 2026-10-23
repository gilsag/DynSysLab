/// <reference types="vite/client" />
interface ImportMetaEnv {
  /** true in the single-file offline builds (dist/offline/*.html) */
  readonly OFFLINE: boolean;
}
