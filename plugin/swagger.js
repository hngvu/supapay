import fp from 'fastify-plugin';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';

async function swaggerPlugin(fastify, options) {
  await fastify.register(fastifySwagger, {
    swagger: {
      info: {
        title: 'Payment Service API',
        description: 'Microservice thanh toán SePay + Supabase',
        version: '1.0.0',
      },
      consumes: ['application/json'],
      produces: ['application/json'],
      securityDefinitions: {
        apiKey: {
          type: 'apiKey',
          name: 'x-api-key',
          in: 'header',
          description: 'Internal API Key để xác thực các API nội bộ'
        },
        bearerAuth: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header',
          description: 'SePay Webhook Authorization (Bearer token)'
        }
      },
      security: []
    },
  });

  await fastify.register(fastifySwaggerUi, {
    routePrefix: '/docs', // Truy cập tại http://localhost:3000/docs
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
      persistAuthorization: true
    },
  });
}

export default fp(swaggerPlugin);