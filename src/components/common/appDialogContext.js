import { createContext, useContext } from 'react';

export const AppDialogContext = createContext(null);

export function useAppDialog() {
  const showAppAlert = useContext(AppDialogContext);
  if (!showAppAlert) {
    throw new Error('useAppDialog must be used within AppDialogProvider.');
  }
  return showAppAlert;
}
