import { beforeEach, describe, expect, it, vi } from 'vitest'

const swaggerJsdoc = vi.fn()

const loadSwaggerModule = async () => {
  vi.resetModules()
  vi.doMock('swagger-jsdoc', () => ({
    default: swaggerJsdoc
  }))
  vi.doMock('../../../src/server/utils/appVersion.js', () => ({
    APP_VERSION: '9.9.9-test'
  }))

  return import('../../../src/server/config/swagger.js')
}

describe('swagger config', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    swaggerJsdoc.mockReturnValue({ openapi: '3.0.0', info: { version: '9.9.9-test' } })
  })

  it('builds the swagger spec lazily from the current routes/controllers and app version', async () => {
    const module = await loadSwaggerModule()

    expect(swaggerJsdoc).not.toHaveBeenCalled()

    const swaggerSpec = await module.getSwaggerSpec()
    const cachedSwaggerSpec = await module.getSwaggerSpec()

    expect(swaggerJsdoc).toHaveBeenCalledTimes(1)
    expect(swaggerJsdoc).toHaveBeenCalledWith(
      expect.objectContaining({
        apis: [
          './src/server/routes/*.ts',
          './src/server/routes/*.js',
          './src/server/controllers/*.ts',
          './src/server/controllers/*.js'
        ],
        definition: expect.objectContaining({
          openapi: '3.0.0',
          info: expect.objectContaining({
            title: 'StarNav API',
            version: '9.9.9-test'
          }),
          servers: expect.arrayContaining([
            expect.objectContaining({ url: 'http://localhost:8080/api' }),
            expect.objectContaining({ url: 'http://localhost:3333/api' }),
            expect.objectContaining({ url: 'https://your-domain.com/api' })
          ]),
          security: [{ bearerAuth: [] }],
          tags: expect.arrayContaining([
            expect.objectContaining({ name: 'Auth' }),
            expect.objectContaining({ name: 'Bookmarks' })
          ]),
          components: expect.objectContaining({
            securitySchemes: expect.objectContaining({
              bearerAuth: expect.objectContaining({
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT'
              })
            }),
            schemas: expect.objectContaining({
              Error: expect.any(Object),
              Bookmark: expect.any(Object),
              HealthCheck: expect.any(Object)
            }),
            responses: expect.objectContaining({
              Unauthorized: expect.any(Object),
              Forbidden: expect.any(Object),
              NotFound: expect.any(Object)
            })
          })
        })
      })
    )
    expect(swaggerSpec).toEqual({ openapi: '3.0.0', info: { version: '9.9.9-test' } })
    expect(cachedSwaggerSpec).toBe(swaggerSpec)
  })
})
