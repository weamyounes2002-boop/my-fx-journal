// Stub file to prevent metaapi.cloud-sdk from being bundled in frontend
// This should never actually be called - all MetaAPI logic is backend-only

export default class MetaApi {
  constructor(_token: string) {
    throw new Error('MetaAPI should only be used on the backend');
  }
}