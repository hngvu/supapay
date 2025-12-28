import Fastify from 'fastify';
import swaggerPlugin from './plugin/swagger.js';
import paymentRoutes from './route/payment.js';
import { verifyInternalRequest, verifySepayWebhook } from './middleware/auth.js';

const fastify = Fastify({ logger: true });

// Đăng ký Middleware functions
fastify.decorate('verifyInternalRequest', verifyInternalRequest);
fastify.decorate('verifySepayWebhook', verifySepayWebhook);

// 1. Đăng ký Plugins
fastify.register(swaggerPlugin);

// 2. Đăng ký Routes
fastify.register(paymentRoutes);

// 3. Khởi chạy Server
const start = async () => {
  try {
    await fastify.ready();
    await fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' });
    
    console.log(`Server running. Docs: http://localhost:${process.env.PORT || 3000}/docs`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();