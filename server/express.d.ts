declare module 'express' {
  export interface Response {
    on(event: string, listener: Function): this;
    statusCode: number;
  }
  
  export interface Request {
    url?: string;
    path?: string;
    method?: string;
  }
  
  export type NextFunction = (err?: any) => void;
}

export {};