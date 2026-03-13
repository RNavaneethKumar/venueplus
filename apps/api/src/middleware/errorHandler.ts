import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'
import { HTTP_STATUS, ERROR_CODES } from '@venueplus/shared'

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  request.log.error({ err: error }, 'Request error')

  // Zod validation errors
  if (error instanceof ZodError) {
    reply.status(HTTP_STATUS.BAD_REQUEST).send({
      success: false,
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Validation failed',
        details: error.flatten().fieldErrors,
      },
    })
    return
  }

  // Fastify validation errors (AJV)
  if (error.validation) {
    reply.status(HTTP_STATUS.BAD_REQUEST).send({
      success: false,
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: error.message,
        details: error.validation,
      },
    })
    return
  }

  // Custom app errors with statusCode
  if (error.statusCode) {
    reply.status(error.statusCode).send({
      success: false,
      error: {
        code: (error as any).code ?? 'UNKNOWN_ERROR',
        message: error.message,
      },
    })
    return
  }

  // Fallback 500
  reply.status(HTTP_STATUS.INTERNAL).send({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
  })
}
