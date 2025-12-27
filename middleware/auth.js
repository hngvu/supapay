/**
 * 1. Middleware bảo vệ API nội bộ (cho /create)
 * Service khác muốn gọi phải gửi Header: "x-api-key": "super_secret_..."
 */
export const verifyInternalRequest = async (request, reply) => {
  const apiKey = request.headers['x-api-key'];

  if (!apiKey || apiKey !== process.env.INTERNAL_API_KEY) {
    throw new Error('Unauthorized: Invalid Internal API Key');
    // Fastify sẽ tự trả về 401 hoặc 500 tuỳ config, ta sẽ custom lại ở dưới
  }
};

/**
 * 2. Middleware bảo vệ Webhook (cho /webhook)
 * SePay sẽ gửi API Key trong Header: "Authorization": "Bearer SP_KV..."
 */
export const verifySepayWebhook = async (request, reply) => {
  const authHeader = request.headers['authorization'];

  // SePay thường gửi dạng: "Bearer <API_KEY>"
  if (!authHeader) {
     throw new Error('Unauthorized: Missing SePay Signature');
  }

  // Tách chữ "Bearer " ra để lấy token
  const token = authHeader.split(' ')[1]; 
  
  if (token !== process.env.SEPAY_API_KEY) {
    throw new Error('Unauthorized: Fake SePay Request');
  }
};