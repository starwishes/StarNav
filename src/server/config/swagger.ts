/**
 * Swagger/OpenAPI Configuration for StarNav
 */

import { createRequire } from 'module'
import { SEARCH_SUGGESTION_PROVIDER_TYPES } from '../../shared/searchSuggestionProviders.js'
import { APP_VERSION } from '../utils/appVersion.js'

const require = createRequire(import.meta.url)

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'StarNav API',
      version: APP_VERSION,
      description: 'RESTful API for StarNav bookmark management system',
      contact: {
        name: 'StarNav Team',
        url: 'https://github.com/starwishes/StarNav'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:8080/api',
        description: 'Local standalone server'
      },
      {
        url: 'http://localhost:3333/api',
        description: 'Development server'
      },
      {
        url: 'https://your-domain.com/api',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token from /auth/login'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Error message' },
            code: { type: 'string', example: 'ERROR_CODE' },
            details: { type: 'string', description: 'Stack trace (dev only)' }
          }
        },
        Category: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Development' },
            parentId: { type: 'integer', nullable: true, example: null },
            level: { type: 'integer', example: 0 },
            icon: { type: 'string', example: '/uploads/icon_123.png' },
            sortIndex: { type: 'integer', example: 1 }
          }
        },
        Bookmark: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'GitHub' },
            url: { type: 'string', example: 'https://github.com' },
            description: { type: 'string', example: 'Code hosting platform' },
            categoryId: { type: 'integer', example: 1 },
            categoryName: { type: 'string', example: 'Development' },
            level: { type: 'integer', example: 0 },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        User: {
          type: 'object',
          properties: {
            username: { type: 'string', example: 'admin' },
            role: { type: 'string', enum: ['admin', 'user', 'guest'], example: 'admin' }
          }
        },
        HealthCheck: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy', 'unhealthy'], example: 'healthy' },
            version: { type: 'string', example: APP_VERSION },
            timestamp: { type: 'string', format: 'date-time' },
            checks: {
              type: 'object',
              properties: {
                uptime: { type: 'integer', example: 123 },
                memory: {
                  type: 'object',
                  properties: {
                    heapUsed: { type: 'string', example: '10MB' },
                    heapTotal: { type: 'string', example: '20MB' },
                    rss: { type: 'string', example: '30MB' }
                  }
                },
                database: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', example: true },
                    size: { type: 'integer', example: 4096 },
                    tables: { type: 'integer', example: 9 }
                  }
                },
                cache: {
                  type: 'object',
                  properties: {
                    hits: { type: 'integer', example: 10 },
                    misses: { type: 'integer', example: 2 },
                    keys: { type: 'integer', example: 4 }
                  }
                }
              }
            }
          }
        },
        CacheStats: {
          type: 'object',
          properties: {
            hits: { type: 'integer', example: 10 },
            misses: { type: 'integer', example: 2 },
            keys: { type: 'integer', example: 4 },
            ksize: { type: 'integer', example: 4 },
            vsize: { type: 'integer', example: 4 }
          }
        },
        UploadedFile: {
          type: 'object',
          properties: {
            filename: { type: 'string', example: 'icon_1234.png' },
            url: { type: 'string', example: '/uploads/icon_1234.png' },
            size: { type: 'integer', example: 2048 },
            uploadedAt: { type: 'string', format: 'date-time' }
          }
        },
        LinkCheckResult: {
          type: 'object',
          properties: {
            url: { type: 'string', example: 'https://github.com' },
            status: { type: 'string', enum: ['ok', 'error'], example: 'ok' }
          }
        },
        SuccessEnvelope: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Success' }
          }
        },
        NavigationData: {
          type: 'object',
          properties: {
            categories: {
              type: 'array',
              items: { $ref: '#/components/schemas/Category' }
            },
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/Bookmark' }
            }
          }
        },
        CategoriesData: {
          type: 'object',
          properties: {
            categories: {
              type: 'array',
              items: { $ref: '#/components/schemas/Category' }
            }
          }
        },
        BookmarkCollectionData: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/Bookmark' }
            }
          }
        },
        BookmarkMutationData: {
          type: 'object',
          properties: {
            item: { $ref: '#/components/schemas/Bookmark' }
          }
        },
        CategoryMutationData: {
          type: 'object',
          properties: {
            item: { $ref: '#/components/schemas/Category' }
          }
        },
        BookmarkExistenceData: {
          type: 'object',
          properties: {
            exists: { type: 'boolean' },
            item: {
              nullable: true,
              allOf: [{ $ref: '#/components/schemas/Bookmark' }]
            }
          }
        }
      },
      responses: {
        SuccessResponse: {
          description: 'Operation completed successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [{ $ref: '#/components/schemas/SuccessEnvelope' }]
              }
            }
          }
        },
        SaveDataResponse: {
          description: 'Navigation data saved successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [{ $ref: '#/components/schemas/SuccessEnvelope' }]
              },
              example: {
                success: true,
                message: '数据保存成功'
              }
            }
          }
        },
        NavigationDataResponse: {
          description: 'Navigation data payload',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessEnvelope' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/NavigationData' }
                    }
                  }
                ]
              }
            }
          }
        },
        CategoriesResponse: {
          description: 'Category list payload',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessEnvelope' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/CategoriesData' }
                    }
                  }
                ]
              }
            }
          }
        },
        BookmarkResponse: {
          description: 'Bookmark payload',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessEnvelope' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/BookmarkMutationData' }
                    }
                  }
                ]
              }
            }
          }
        },
        BookmarkSearchResponse: {
          description: 'Bookmark search payload',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessEnvelope' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/BookmarkCollectionData' }
                    }
                  }
                ]
              }
            }
          }
        },
        BookmarkExistsResponse: {
          description: 'Bookmark existence payload',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessEnvelope' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/BookmarkExistenceData' }
                    }
                  }
                ]
              }
            }
          }
        },
        CategoryResponse: {
          description: 'Category payload',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessEnvelope' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/CategoryMutationData' }
                    }
                  }
                ]
              }
            }
          }
        },
        Unauthorized: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                error: 'Unauthorized',
                code: 'UNAUTHORIZED'
              }
            }
          }
        },
        Forbidden: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                error: 'Permission denied',
                code: 'FORBIDDEN'
              }
            }
          }
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                error: 'Resource not found',
                code: 'NOT_FOUND'
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      { name: 'System', description: 'System health and settings' },
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Sessions', description: 'Session management' },
      { name: 'Admin', description: 'Administrative endpoints' },
      { name: 'Categories', description: 'Category management' },
      { name: 'Bookmarks', description: 'Bookmark CRUD operations' },
      { name: 'Statistics', description: 'Statistics and analytics' },
      { name: 'Tools', description: 'Auxiliary tools and network helpers' }
    ]
  },
  apis: [
    './src/server/routes/*.ts',
    './src/server/routes/*.js',
    './src/server/controllers/*.ts',
    './src/server/controllers/*.js'
  ]
}

let swaggerSpecPromise: Promise<unknown> | null = null

const ensureSwaggerJsdocYamlCompat = () => {
  const yaml = require('yaml')

  // swagger-jsdoc@6 mutates YAML.defaultOptions, but newer yaml releases no longer
  // expose that object by default.
  if (!yaml.defaultOptions) {
    yaml.defaultOptions = {}
  }

  if (!yaml.__starnavSwaggerParseDocumentCompat) {
    const originalParseDocument = yaml.parseDocument.bind(yaml)

    yaml.parseDocument = (...args: unknown[]) => {
      const document = originalParseDocument(...args)

      if (!document.anchors) {
        document.anchors = {
          getNames: () => []
        }
      }

      return document
    }
    yaml.__starnavSwaggerParseDocumentCompat = true
  }
}

export const getSwaggerSpec = async () => {
  if (!swaggerSpecPromise) {
    swaggerSpecPromise = Promise.resolve()
      .then(() => {
        ensureSwaggerJsdocYamlCompat()
        return import('swagger-jsdoc')
      })
      .then(({ default: swaggerJsdoc }) => swaggerJsdoc(options))
      .then((swaggerSpec) => {
        const spec = swaggerSpec as {
          paths?: Record<
            string,
            {
              get?: {
                parameters?: Array<{
                  name?: string
                  in?: string
                  schema?: { enum?: string[]; default?: string }
                }>
              }
            }
          >
        }
        const suggestTypeSchema =
          spec.paths?.['/suggest']?.get?.parameters?.find(
            (parameter) => parameter?.name === 'type' && parameter?.in === 'query'
          )?.schema || null

        if (suggestTypeSchema) {
          suggestTypeSchema.enum = [...SEARCH_SUGGESTION_PROVIDER_TYPES]
          suggestTypeSchema.default = 'baidu'
        }

        return swaggerSpec
      })
      .catch((error) => {
        swaggerSpecPromise = null
        throw error
      })
  }

  return swaggerSpecPromise
}
