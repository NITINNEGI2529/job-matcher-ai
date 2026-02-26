import { toast } from 'sonner';

/**
 * Show a success toast notification
 * @param message - The success message to display
 */
export function showSuccessToast(message: string) {
  toast.success(message);
}

/**
 * Show an error toast notification
 * @param message - The error message to display
 */
export function showErrorToast(message: string) {
  toast.error(message);
}

/**
 * Show an info toast notification
 * @param message - The info message to display
 */
export function showInfoToast(message: string) {
  toast.info(message);
}

/**
 * Show a loading toast notification
 * @param message - The loading message to display
 * @returns The toast ID for dismissal
 */
export function showLoadingToast(message: string) {
  return toast.loading(message);
}

/**
 * Dismiss a toast by ID
 * @param toastId - The ID of the toast to dismiss
 */
export function dismissToast(toastId: string | number) {
  toast.dismiss(toastId);
}
