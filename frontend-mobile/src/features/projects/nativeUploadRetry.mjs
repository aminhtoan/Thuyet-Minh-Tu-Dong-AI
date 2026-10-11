export function shouldRetryNativeUpload(status, retryAvailable, refreshSucceeded) {
  return status === 401 && retryAvailable && refreshSucceeded;
}
