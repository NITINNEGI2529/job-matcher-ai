export interface ApiResponse<T = any> {
  data: T | null;
  error: ApiError | null;
  meta?: ApiMeta;
}

export interface ApiError {
  message: string;
  code?: string;
  fields?: Record<string, string[]>;
}

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  [key: string]: any;
}

/**
 * Creates a standard success response envelope
 */
export function successResponse<T>(data: T, meta?: ApiMeta, status = 200) {
  return Response.json(
    {
      data,
      error: null,
      ...(meta ? { meta } : {}),
    },
    { status }
  );
}

/**
 * Creates a standard error response envelope
 */
export function errorResponse(error: ApiError, status = 400) {
  return Response.json(
    {
      data: null,
      error,
    },
    { status }
  );
}
