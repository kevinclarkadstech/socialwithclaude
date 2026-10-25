export type AppError = AuthenticationError | AuthorizationError | ValidationError | TooManyRequestsError | UnexpectedError | PhotoUploadError | EntityNotFoundError;

export type AuthenticationError = {
    type: 'authentication';
    message?: string;
}

export type AuthorizationError = {
    type: 'authorization';
    message?: string;
}

export type EntityNotFoundError = {
    type: 'entity-not-found';
    message?: string;
}

export type ValidationError = {
    type: 'validation';
    message?: string;
    metadata?: {
        errors: ValidationErrorDetail[]
    }
}

export type TooManyRequestsError = {
    type: 'too-many-requests';
    message?: string;
}

export type UnexpectedError = {
    type: 'unexpected';
    message?: string;
}

export type PhotoUploadError = {
    type: 'photo-upload';
    message?: string;
}

export type ValidationErrorDetail = {
    message: string,
    path?: string,
};

export function ValidationError(errors: ValidationErrorDetail[], message?: string): ValidationError {
    return {
        type: 'validation',
        message: message ?? 'There were validation errors',
        metadata: {
            errors
        }
    }
}

export class ValidationException extends Error {
    error: ValidationError;

    constructor(error: ValidationError) {
        super(error.message ?? 'There were validation errors');
        this.error = error;
    }
}

export function PhotoUploadError(message?: string): PhotoUploadError {
    return {
        type: 'photo-upload',
        message: message ?? 'There was an error uploading your photo(s).  Please try again.',
    }
}

export function UnexpectedError(message?: string): UnexpectedError {
    return {
        type: 'unexpected',
        message: message ?? 'An unexpected error occurred'
    }
}

export function EntityNotFoundError(message?: string): EntityNotFoundError {
    return {
        type: 'entity-not-found',
        message: message ?? 'Entity not found'
    }
}

export function AuthenticationError(message?: string): AuthenticationError {
    return {
        type: 'authentication',
        message: message ?? 'Authentication error'
    }
}

export function AuthorizationError(message?: string): AuthorizationError {
    return {
        type: 'authorization',
        message: message ?? 'Authorization error'
    }
}