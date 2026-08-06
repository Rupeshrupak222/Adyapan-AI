export type HttpError = Error & {
  statusCode?: number;
  code?: string;
};

export function httpError(statusCode: number, message: string, code?: string): HttpError {
  const error = new Error(message) as HttpError;
  error.statusCode = statusCode;
  if (code) error.code = code;
  return error;
}
