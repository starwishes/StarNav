export const getErrorMessage = (error: unknown, fallback = '操作失败') => {
  if (typeof error === 'string') {
    return error || fallback
  }

  if (error instanceof Error) {
    return error.message || fallback
  }

  if (error && typeof error === 'object') {
    if ('message' in error && typeof error.message === 'string' && error.message) {
      return error.message
    }

    if ('error' in error && typeof error.error === 'string' && error.error) {
      return error.error
    }
  }

  return fallback
}
