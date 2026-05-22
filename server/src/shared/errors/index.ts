export class AppError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(40001, message, 400);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'resource not found') {
    super(40004, message, 404);
    this.name = 'NotFoundError';
  }
}

export class StateError extends AppError {
  constructor(message: string) {
    super(40009, message, 409);
    this.name = 'StateError';
  }
}

export class AuthError extends AppError {
  constructor(message: string = 'admin auth failed') {
    super(40101, message, 401);
    this.name = 'AuthError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'access denied') {
    super(40301, message, 403);
    this.name = 'ForbiddenError';
  }
}

export class InternalError extends AppError {
  constructor(message: string = 'internal server error') {
    super(50001, message, 500);
    this.name = 'InternalError';
  }
}

export class AITaskError extends AppError {
  constructor(message: string = 'ai task execution failed') {
    super(50002, message, 500);
    this.name = 'AITaskError';
  }
}
