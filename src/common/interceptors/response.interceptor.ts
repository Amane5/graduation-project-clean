import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
  } from '@nestjs/common';
  import { map } from 'rxjs/operators';
  import { Observable } from 'rxjs';
  
  @Injectable()
  export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
      return next.handle().pipe(
        map((data) => {
          return {
            success: true,
            statusCode: context.switchToHttp().getResponse().statusCode,
            message: data?.message || 'Success',
            data: this.cleanData(data),
          };
        }),
      );
    }
  
    private cleanData(data: any) {
        if (data === undefined || data === null) {
    return null;
  }
    if (Array.isArray(data)) {
    return data;
  }
      // if (!data) return null;
  
      // نحذف message من data حتى ما تتكرر
        if (typeof data === 'object') {
    const { message, ...rest } = data;
    return Object.keys(rest).length ? rest : {};
  }

  return data;
      // const { message, ...rest } = data;
      // return Object.keys(rest).length ? rest : null;
    }
  }