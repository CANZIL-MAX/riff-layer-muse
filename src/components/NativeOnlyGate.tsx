// iOS-only app - NativeOnlyGate simplified to always allow access
export const NativeOnlyGate = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};