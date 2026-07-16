import { logError } from './auditLogger'

export const handleApiError = (error, context = {}) => {
  let message = 'An unexpected error occurred'
  let status = 0
  let details = null

  if (error.response) {
    status = error.response.status
    details = error.response.data

    switch (status) {
      case 400:
        message = details?.error || 'Invalid request. Please check your input.'
        break
      case 401:
        message = 'Your session has expired. Please log in again.'
        break
      case 403:
        message = 'You do not have permission to perform this action.'
        break
      case 404:
        message = 'The requested resource was not found.'
        break
      case 409:
        message = details?.error || 'A conflict occurred. Please try again.'
        break
      case 422:
        message = details?.error || 'Validation failed. Please check your input.'
        break
      case 429:
        message = 'Too many requests. Please wait a moment and try again.'
        break
      case 500:
      case 502:
      case 503:
        message = 'Server error. Please try again later.'
        break
      default:
        message = details?.error || `Request failed with status ${status}`
    }
  } else if (error.request) {
    message = 'Unable to connect to the server. Please check your network connection.'
  } else if (error.message) {
    message = error.message
  }

  logError('api_error', error, { ...context, status, responseMessage: message })

  return { message, status, details }
}

export const safeApiCall = async (apiFn, fallback = null, context = {}) => {
  try {
    const response = await apiFn()
    return response
  } catch (error) {
    const handled = handleApiError(error, context)
    console.warn(`API call failed: ${handled.message}`, context)
    if (fallback !== undefined) return fallback
    throw handled
  }
}

export const withRetry = (apiFn, maxRetries = 3, delay = 1000) => {
  return async (...args) => {
    let lastError
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await apiFn(...args)
      } catch (error) {
        lastError = error
        if (attempt < maxRetries && error.response?.status >= 500) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt))
        } else {
          break
        }
      }
    }
    throw lastError
  }
}

export const isNetworkError = (error) => {
  return !error.response && error.request
}

export const isServerError = (error) => {
  return error.response && error.response.status >= 500
}
