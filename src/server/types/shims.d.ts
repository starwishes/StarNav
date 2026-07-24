/**
 * Ambient modules for packages without (or with incomplete) TypeScript types.
 * better-sqlite3 Statement is generic: default T=any keeps call sites green;
 * pass prepare<RowType>() / Statement row interfaces at hotspots progressively.
 */

declare module 'swagger-jsdoc' {
  type SwaggerDefinition = Record<string, unknown>
  interface Options {
    definition?: SwaggerDefinition
    swaggerDefinition?: SwaggerDefinition
    apis?: string[]
    [key: string]: unknown
  }
  export default function swaggerJSDoc(options?: Options): Record<string, unknown>
}

declare module 'swagger-ui-express' {
  import type { RequestHandler } from 'express'
  interface SwaggerUiOptions {
    customCss?: string
    customSiteTitle?: string
    swaggerOptions?: Record<string, unknown>
    [key: string]: unknown
  }
  export const serve: RequestHandler[]
  export function setup(
    swaggerDoc: unknown,
    options?: SwaggerUiOptions,
    customOptions?: Record<string, unknown>,
    customCss?: string,
    customfavIcon?: string,
    swaggerUrl?: string,
    customSiteTitle?: string
  ): RequestHandler
  const swaggerUi: {
    serve: typeof serve
    setup: typeof setup
  }
  export default swaggerUi
}

declare module 'better-sqlite3' {
  namespace BetterSqlite3 {
    interface RunResult {
      changes: number
      lastInsertRowid: number | bigint
    }

    /**
     * @typeParam T - Row shape returned by get/all/iterate (default any).
     * Bind params stay loose (`any[]`) so progressive call-site typing focuses on rows.
     */
    interface Statement<T = any> {
      run(...params: any[]): RunResult
      get(...params: any[]): T | undefined
      all(...params: any[]): T[]
      iterate(...params: any[]): IterableIterator<T>
    }

    interface Database {
      prepare<T = any>(source: string): Statement<T>
      exec(source: string): this
      pragma(source: string, options?: { simple?: boolean }): any
      transaction<T extends (...args: any[]) => any>(fn: T): T
      close(): void
      backup?(destination: string): Promise<void>
    }

    interface DatabaseConstructor {
      new (filename: string, options?: Record<string, unknown>): Database
      (filename: string, options?: Record<string, unknown>): Database
      prototype: Database
    }
  }

  const Database: BetterSqlite3.DatabaseConstructor
  export = Database
  namespace Database {
    type Database = BetterSqlite3.Database
    type Statement<T = any> = BetterSqlite3.Statement<T>
  }
}
