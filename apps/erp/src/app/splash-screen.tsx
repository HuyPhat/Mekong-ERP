// Shown only while the mocked backend seeds its (large) demo dataset into
// IndexedDB for the first time in this browser — a one-time cost on a fresh
// profile; every later load hydrates from IndexedDB in milliseconds. Kept
// independent of the app's own i18n/theme setup, since neither has
// initialized yet at this point in bootstrap.
export function SplashScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background text-center text-foreground">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
      <p className="text-sm text-muted-foreground">
        Preparing demo data… / Đang chuẩn bị dữ liệu demo…
      </p>
    </div>
  );
}
