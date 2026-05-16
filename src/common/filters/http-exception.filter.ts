import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
  } from '@nestjs/common';
  import { Prisma } from '@prisma/client';
  
  @Catch()
  export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: any, host: ArgumentsHost) {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse();
  
      let status = HttpStatus.INTERNAL_SERVER_ERROR;
      let message: any = 'Internal server error';
      let error = 'INTERNAL_ERROR';
  
      //  HttpException
      if (exception instanceof HttpException) {
        status = exception.getStatus();
        const res: any = exception.getResponse();
  
        if (typeof res === 'string') {
          message = res;
        } else {
          message = res.message || message;
          error = res.error || error;
        }
      }
  
      //  Validation Errors (class-validator)
      else if (Array.isArray(exception?.response?.message)) {
        status = 422;
        message = exception.response.message;
        error = 'VALIDATION_ERROR';
      }
  
      // fallback
      else {
        console.error('UNKNOWN ERROR:', exception);
      }
  
      response.status(status).json({
        success: false,
        statusCode: status,
        message,
        error,
      });
    }
  }