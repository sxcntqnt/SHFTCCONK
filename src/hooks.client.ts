import type { HandleClientError } from '@sveltejs/kit'

export const handleError: HandleClientError = ({ error, event }) => {
  console.error('CLIENT ERROR:', error)
  console.error('EVENT:', event.url.pathname)
  // Log the full stack
  if (error instanceof Error) {
    console.error('STACK:', error.stack)
  }
}
