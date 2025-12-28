import supabase from '../config/supabase.js';
import { generateContentCode } from '../util/generator.js';

export default async function paymentRoutes(fastify, options) {

  // --- API 1: Tạo Payment Link ---
  fastify.post('/init', {
    onRequest: [fastify.verifyInternalRequest],
    schema: {
      tags: ['Payment'],
      security: [{ apiKey: [] }],
      body: {
        type: 'object',
        required: ['amount', 'refCode'],
        properties: {
          amount: { type: 'number' },
          refCode: { type: 'string' }
        }
      }
    }
  }, async (req, reply) => {
    const { amount, refCode } = req.body;
    
    // 1. Logic Retry tạo mã Unique (tránh trùng lặp)
    let content = '';
    let isUnique = false;
    let retries = 0;

    while (!isUnique && retries < 5) {
      content = generateContentCode(); // VD: X9K2M1
      // Kiểm tra sơ bộ trong DB xem trùng chưa (Option)
      // Ở đây ta để DB check unique constraint cho nhanh
      isUnique = true; 
      retries++;
    }

    // 2. Tính thời gian hết hạn (VD: 10 phút)
    const timeoutMins = 10;
    const expiresAt = new Date(Date.now() + timeoutMins * 60000);

    // 3. Insert vào DB
    const { data, error } = await supabase
      .from('payment_transactions')
      .insert([{
        ref_code: refCode,
        content: content,
        expected_amount: amount,
        expires_at: expiresAt.toISOString(),
        status: 'PENDING'
      }])
      .select()
      .single();

    if (error) {
      fastify.log.error(error);
      // Nếu lỗi do trùng Content (code 23505), nên có logic retry ở trên tốt hơn
      return reply.code(500).send({ error: 'Lỗi tạo giao dịch' });
    }

    // 4. Trả về QR
    const qrUrl = `https://qr.sepay.vn/img?acc=${process.env.MY_BANK_ACC}&bank=${process.env.MY_BANK_NAME}&amount=${amount}&des=${content}`;
    
    return { 
      success: true, 
      content, 
      qrUrl, 
      expiresAt: expiresAt.toISOString() 
    };
  });

  // --- API 2: Webhook SePay ---
  fastify.post('/webhook', {
    onRequest: [fastify.verifySepayWebhook],
    schema: {
      tags: ['Payment'],
      description: 'Webhook nhận dữ liệu từ SePay',
      security: [{ bearerAuth: [] }]
    }
  }, async (req, reply) => {
    const { id: gatewayTxnId, content, transferAmount } = req.body;

    // 1. Tìm đơn hàng
    // Trích xuất mã CK từ content (VD: "chuyen tien CKX9K2M1" -> "CKX9K2M1")
    const ckMatch = content.match(/CK[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}/);
    
    if (!ckMatch) {
      fastify.log.warn(`Webhook: Không tìm thấy mã CK trong content: ${content}`);
      return { success: true };
    }

    const ckCode = ckMatch[0];

    const { data: trans, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('content', ckCode)
      .single();

    if (!trans) {
        // Không tìm thấy -> Return 200 để SePay không gửi lại (vì lỗi do người dùng nhập sai nội dung)
        fastify.log.warn(`Webhook: Không tìm thấy giao dịch với mã ${ckCode}`);
        return { success: true };
    }

    // Nếu đơn đã kết thúc (Success/Expired/...) thì bỏ qua hoặc log lại
    if (trans.status !== 'PENDING' && trans.status !== 'PARTIAL_PAID') {
        return { success: true, message: 'Transaction already processed' };
    }

    // 2. LOGIC CHECK TIMEOUT & AMOUNT
    const now = new Date();
    const isExpired = new Date(trans.expires_at) < now;
    const isEnough = transferAmount >= trans.expected_amount;

    let newStatus = 'PENDING';

    if (!isEnough) {
        newStatus = 'PARTIAL_PAID'; // Thiếu tiền -> Dù đúng giờ hay trễ đều ưu tiên báo thiếu
    } else if (isExpired) {
        newStatus = 'LATE_PAYMENT'; // Đủ tiền nhưng TRỄ
        fastify.log.warn(`Giao dịch ${trans.ref_code} thanh toán trễ!`);
    } else {
        newStatus = 'SUCCESS'; // Hoàn hảo
    }

    // 3. Update DB
    const { error: updateError } = await supabase
      .from('payment_transactions')
      .update({
        status: newStatus,
        received_amount: transferAmount,
        gateway_txn_id: String(gatewayTxnId),
        gateway_response: req.body,
        paid_at: now.toISOString(),
        updated_at: now.toISOString()
      })
      .eq('id', trans.id);

    if (updateError) {
        fastify.log.error(updateError);
        return reply.code(500).send({ error: 'DB Error' });
    }

    return { success: true, status: newStatus };
  });

  // --- API 3: Lấy thông tin giao dịch ---
  fastify.get('/:ref_code', {
    onRequest: [fastify.verifyInternalRequest],
    schema: {
      tags: ['Payment'],
      description: 'Lấy thông tin giao dịch theo refCode',
      security: [{ apiKey: [] }],
      params: {
        type: 'object',
        properties: {
          ref_code: { type: 'string', description: 'Mã tham chiếu giao dịch' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' }
          }
        }
      }
    }
  }, async (req, reply) => {
    const { ref_code } = req.params;

    // Tìm theo ref_code
    const { data, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('ref_code', ref_code)
      .single();

    if (error || !data) {
      return reply.code(404).send({ 
        success: false, 
        error: 'Không tìm thấy giao dịch' 
      });
    }

    return { 
      success: true, 
      data: {
        refCode: data.ref_code,
        content: data.content,
        expectedAmount: data.expected_amount,
        receivedAmount: data.received_amount,
        status: data.status,
        expiresAt: data.expires_at,
        paidAt: data.paid_at,
        createdAt: data.created_at
      }
    };
  });
}