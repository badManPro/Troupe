export const DELETE_PROJECT_CONFIRMATION_TEXT = "确认删除";

export function isProjectDeletionConfirmationValid(value: string) {
  return value.trim() === DELETE_PROJECT_CONFIRMATION_TEXT;
}
