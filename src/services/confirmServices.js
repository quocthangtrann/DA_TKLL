// src/services/confirmService.js
// tiny in-memory service to pass pending stop request between pages
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

export function confirm() {
  if (typeof onConfirmCallback === "function") {
    onConfirmCallback(pending);
  }
  clearPendingStop();
}

export function cancel() {
  if (typeof onCancelCallback === "function") {
    onCancelCallback(pending);
  }
  clearPendingStop();
}
