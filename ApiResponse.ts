// import HttpStatus from "@/shared/modules/response/enums/HttpStatus.ts";

// const CORS_HEADERS = {
//   "Access-Control-Allow-Origin": "*",
//   "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
//   "Access-Control-Allow-Headers":
//     "authorization, x-client-info, apikey, content-type, elevenlabs-signature, stripe-signature, x-requested-with, cache-control, pragma, accept, accept-encoding, accept-language, user-agent, referer, origin, x-correlation-id",
// } as const;

// export class ApiResponse<T = unknown> {
//   public _code: number;
//   public _message: string;
//   public _data: T | null;
//   private _error: Record<string, unknown> | string | null = null;
//   private _errorCode: string | null = null;
//   private readonly _headers: Headers;

//   constructor() {
//     this._code = HttpStatus.OK;
//     this._message = "Success";
//     this._data = null;
//     this._headers = new Headers({
//       "Content-Type": "application/json; charset=utf-8",
//       ...CORS_HEADERS,
//     });
//   }

//   static create<U = unknown>(): ApiResponse<U> {
//     return new ApiResponse<U>();
//   }

//   // ---------- Status helpers ----------
//   ok(): this {
//     this._code = HttpStatus.OK;
//     return this;
//   }
//   unknown(): this {
//     this._code = HttpStatus.INTERNAL_SERVER_ERROR;
//     return this;
//   }
//   notFound(): this {
//     this._code = HttpStatus.NOT_FOUND;
//     return this;
//   }
//   badRequest(): this {
//     this._code = HttpStatus.BAD_REQUEST;
//     return this;
//   }
//   forbidden(): this {
//     this._code = HttpStatus.FORBIDDEN;
//     return this;
//   }
//   notAuthorized(): this {
//     this._code = HttpStatus.UNAUTHORIZED;
//     return this;
//   }
//   validationError(): this {
//     this._code = HttpStatus.UNPROCESSABLE_ENTITY;
//     return this;
//   }
//   tokenExpiration(): this {
//     this._code = HttpStatus.NOT_ACCEPTABLE;
//     return this;
//   }

//   // ---------- Mutators ----------
//   headers(input: HeadersInit): this {
//     const add = new Headers(input);
//     add.forEach((v, k) => this._headers.set(k, v));
//     return this;
//   }

//   message(message?: string | null): this {
//     this._message = message ?? this._message;
//     return this;
//   }

//   data(value?: T | null): this {
//     if (value === undefined) {
//       this._data = null;
//     } else {
//       this._data = value as T | null;
//     }
//     return this;
//   }

//   code(statusCode: number): this {
//     this._code = statusCode;
//     return this;
//   }

//   error(errorInfo: Record<string, unknown> | string): this {
//     this._error = errorInfo;
//     return this;
//   }

//   errorCode(code: string): this {
//     this._errorCode = code;
//     return this;
//   }

//   noData(value: T | null = null): this {
//     this._data = value;
//     this._message = "There is no data";
//     this._code = HttpStatus.NOT_FOUND;
//     return this;
//   }

//   // ---------- Messages ----------
//   getSuccess(): this {
//     this._message = "Data retrieved successfully";
//     return this;
//   }
//   storeSuccess(): this {
//     this._message = "Data stored successfully";
//     return this;
//   }
//   updateSuccess(): this {
//     this._message = "Data updated successfully";
//     return this;
//   }
//   deleteSuccess(): this {
//     this._message = "Data deleted successfully";
//     return this;
//   }
//   unknownError(): this {
//     this._message = "An unknown error occurred";
//     return this;
//   }

//   when(
//     condition: boolean | ((self: this) => boolean),
//     then: (self: this) => this,
//     otherwise?: (self: this) => this,
//   ): this {
//     const ok = typeof condition === "function" ? condition(this) : condition;
//     if (ok) return then(this);
//     return otherwise ? otherwise(this) : this;
//   }

//   toJson(): string {
//     const response: {
//       data: T | null;
//       message: string;
//       code: number;
//       errorCode?: string;
//       error?: Record<string, unknown> | string;
//     } = {
//       data: this._data,
//       message: this._message,
//       code: this._code,
//     };

//     if (this._errorCode) {
//       response.errorCode = this._errorCode;
//     }

//     if (this._error) {
//       response.error = this._error;
//     }

//     return JSON.stringify(response);
//   }

//   send(): Response {
//     return new Response(this.toJson(), {
//       status: this._code,
//       headers: this._headers,
//     });
//   }

//   createdSuccessfully(value?: T | null): Response {
//     return this.ok()
//       .data(value ?? null)
//       .storeSuccess()
//       .send();
//   }

//   getSuccessfully(value?: T | null): Response {
//     return this.ok()
//       .data(value ?? null)
//       .getSuccess()
//       .send();
//   }

//   updatedSuccessfully(value?: T | null): Response {
//     return this.ok()
//       .data(value ?? null)
//       .updateSuccess()
//       .send();
//   }

//   deleteSuccessfully(value: T | null = null): Response {
//     return this.ok().data(value).deleteSuccess().send();
//   }

//   corsPreflight(): Response {
//     return this.ok().send();
//   }
// }

// export function rest() {
//   return ApiResponse.create();
// }
