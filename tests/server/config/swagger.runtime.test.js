// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

describe('swagger runtime spec', () => {
  // swagger-jsdoc walks all route/controller sources; allow headroom under load
  it('builds a real OpenAPI spec from route annotations', async () => {
    vi.resetModules()

    const [{ getSwaggerSpec }, { APP_VERSION }] = await Promise.all([
      import('../../../src/server/config/swagger.js'),
      import('../../../src/server/utils/appVersion.js')
    ])

    const swaggerSpec = await getSwaggerSpec()

    expect(swaggerSpec.openapi).toBe('3.0.0')
    expect(swaggerSpec.info).toEqual(
      expect.objectContaining({
        title: 'StarNav API',
        version: APP_VERSION
      })
    )
    expect(swaggerSpec.paths).toEqual(
      expect.objectContaining({
        '/login': expect.objectContaining({
          post: expect.objectContaining({
            tags: ['Auth']
          })
        }),
        '/data': expect.objectContaining({
          get: expect.any(Object),
          post: expect.any(Object)
        }),
        '/health': expect.objectContaining({
          get: expect.objectContaining({
            tags: ['System']
          })
        })
      })
    )
    expect(swaggerSpec.paths['/suggest']?.get?.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'type',
          in: 'query',
          schema: expect.objectContaining({
            enum: ['baidu', 'google', 'bing', 'duckduckgo', 'brave'],
            default: 'baidu'
          })
        })
      ])
    )
    expect(swaggerSpec.components).toEqual(
      expect.objectContaining({
        securitySchemes: expect.objectContaining({
          bearerAuth: expect.objectContaining({
            type: 'http',
            scheme: 'bearer'
          })
        }),
        schemas: expect.objectContaining({
          Bookmark: expect.any(Object),
          Category: expect.any(Object),
          HealthCheck: expect.any(Object)
        }),
        responses: expect.objectContaining({
          NavigationDataResponse: expect.any(Object),
          BookmarkResponse: expect.any(Object),
          CategoryResponse: expect.any(Object)
        })
      })
    )
    expect(swaggerSpec.tags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'System' }),
        expect.objectContaining({ name: 'Bookmarks' }),
        expect.objectContaining({ name: 'Tools' })
      ])
    )
    expect(() => JSON.stringify(swaggerSpec)).not.toThrow()
  }, 30000)
})
