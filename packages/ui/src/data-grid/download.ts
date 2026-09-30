/** Saves a Blob as a file via a temporary object URL and an `<a download>` click. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  // Revoking in the same tick can cancel the download in some browsers.
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}
