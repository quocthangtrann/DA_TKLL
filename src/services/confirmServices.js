let pending = null;
let onConfirmCallback = null;
let onCancelCallback = null;

export function setPendingStop(data = {}) {
  pending = data;
}

export function getPendingStop() {
  return pending;
}

export function clearPendingStop() {
  pending = null;
  onConfirmCallback = null;
  onCancelCallback = null;
}

export function registerHandlers({ onConfirm, onCancel }) {
  onConfirmCallback = onConfirm;
  onCancelCallback = onCancel;
}

export async function confirm() {
  try {
    if (typeof onConfirmCallback === "function") {
      await onConfirmCallback(pending);
    }
  } finally {
    clearPendingStop();
  }
}

export async function cancel() {
  try {
    if (typeof onCancelCallback === "function") {
      await onCancelCallback(pending);
    }
  } finally {
    clearPendingStop();
  }
}
