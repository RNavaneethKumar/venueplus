import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  db as globalDb,
  orders,
  orderItems,
  orderPayments,
  orderStatusHistory,
  capacityHolds,
  reservations,
  reservationGroups,
  productReservationConfig,
  wallets,
  walletTransactions,
  giftCards,
  giftCardTransactions,
  promoCodes,
  promoCodeUsages,
  cashSessions,
  products,
  visitorTypes,
  accounts,
  eq,
  and,
  or,
  gt,
  gte,
  lte,
  isNull,
  ilike,
  asc,
  sql,
  type DB,
} from '@venueplus/database'
import { requireVenueHeader } from '../../middleware/auth.js'
import { HTTP_STATUS } from '@venueplus/shared'

// ─── DB resolver ─────────────────────────────────────────────────────────────

/** Returns the per-tenant Drizzle DB in multi-tenant mode, global DB otherwise. */
function resolveDb(req: import('fastify').FastifyRequest): DB {
  return req.tenantDb ?? globalDb
}


// ─── Schemas ──────────────────────────────────────────────────────────────────

const CreateOrderBody = z.object({
  channel: z.enum(['online', 'pos', 'kiosk']),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().positive(),
      visitorTypeId: z.string().uuid().optional(),
      resourceSlotId: z.string().uuid().optional(),
      resourceId: z.string().uuid().optional(),
      holdId: z.string().uuid().optional(),
      unitPrice: z.number().positive(),
      discountAmount: z.number().min(0).default(0),
    })
  ),
  payments: z.array(
    z.object({
      method: z.enum(['cash', 'upi', 'card', 'wallet', 'gift_card', 'redemption_card']),
      amount: z.number().positive(),
      // For wallet/gift card payments
      walletId: z.string().uuid().optional(),
      giftCardCode: z.string().optional(),
    })
  ),
  promoCode: z.string().optional(),
  accountId: z.string().uuid().optional(),
  operatorId: z.string().uuid().optional(),
  notes: z.string().optional(),
})

// ─── Routes ───────────────────────────────────────────────────────────────────

export async function orderRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/orders/promo/:code
   * Validate a promo code and return discount details.
   * Must be registered BEFORE /:id to avoid route conflict.
   */
  fastify.get<{ Params: { code: string }; Querystring: { subtotal?: string } }>(
    '/promo/:code',
    { preHandler: [requireVenueHeader] },
    async (request, reply) => {
    const db = resolveDb(request)
      const venueId = request.venueId!
      const codeUpper = request.params.code.toUpperCase()
      const subtotalAmount = parseFloat(request.query.subtotal ?? '0') || 0
      const now = new Date()

      const promo = await db.query.promoCodes.findFirst({
        where: and(
          eq(promoCodes.venueId, venueId),
          eq(promoCodes.code, codeUpper),
          eq(promoCodes.isActive, true),
          or(isNull(promoCodes.effectiveUntil), gt(promoCodes.effectiveUntil, now))
        ),
      })

      if (!promo) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: 'PROMO_INVALID', message: 'Promo code not found or expired' },
        })
      }

      // Check usage limits
      if (promo.maxUses !== null && promo.currentUses >= promo.maxUses) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: { code: 'PROMO_EXHAUSTED', message: 'Promo code has reached its usage limit' },
        })
      }

      // Check minimum order amount
      if (promo.minimumOrderAmount !== null && subtotalAmount < Number(promo.minimumOrderAmount)) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: {
            code: 'PROMO_MIN_ORDER',
            message: `Minimum order amount of ₹${Number(promo.minimumOrderAmount).toLocaleString('en-IN')} required`,
          },
        })
      }

      // Compute discount preview
      let discountAmount: number
      if (promo.discountType === 'percent') {
        discountAmount = subtotalAmount * (Number(promo.discountValue) / 100)
      } else {
        discountAmount = Math.min(Number(promo.discountValue), subtotalAmount)
      }

      return reply.send({
        success: true,
        data: {
          code: promo.code,
          description: promo.description,
          discountType: promo.discountType,
          discountValue: Number(promo.discountValue),
          discountAmount: parseFloat(discountAmount.toFixed(2)),
        },
      })
    }
  )

  /**
   * POST /api/v1/orders
   * Create a new order and process payment.
   */
  fastify.post('/', { preHandler: [requireVenueHeader] }, async (request, reply) => {
    const db = resolveDb(request)
    const venueId = request.venueId!
    const body = CreateOrderBody.parse(request.body)

    // Compute base subtotal from items
    const itemsSubtotal = body.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity - item.discountAmount,
      0
    )

    // Apply promo code discount if provided
    let promoDiscount = 0
    let validatedPromo: typeof promoCodes.$inferSelect | null = null

    if (body.promoCode) {
      const codeUpper = body.promoCode.toUpperCase()
      const now = new Date()
      const promo = await db.query.promoCodes.findFirst({
        where: and(
          eq(promoCodes.venueId, venueId),
          eq(promoCodes.code, codeUpper),
          eq(promoCodes.isActive, true),
          or(isNull(promoCodes.effectiveUntil), gt(promoCodes.effectiveUntil, now))
        ),
      })

      if (promo && (promo.maxUses === null || promo.currentUses < promo.maxUses)) {
        if (promo.discountType === 'percent') {
          promoDiscount = itemsSubtotal * (Number(promo.discountValue) / 100)
        } else {
          promoDiscount = Math.min(Number(promo.discountValue), itemsSubtotal)
        }
        validatedPromo = promo
      }
    }

    const subtotal = itemsSubtotal - promoDiscount
    const taxAmount = subtotal * 0.18 // simplified — real impl uses product tax structures
    const totalAmount = subtotal + taxAmount

    // Generate order number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const randSuffix = Math.floor(100000 + Math.random() * 900000)
    const orderNumber = `ORD-${dateStr}-${randSuffix}`

    // For POS orders: look up the currently open till session for this operator
    // so every order is linked to the active session for cash reconciliation.
    let cashSessionId: string | null = null
    if (body.channel === 'pos' && body.operatorId) {
      const [activeSession] = await db
        .select({ id: cashSessions.id })
        .from(cashSessions)
        .where(
          and(
            eq(cashSessions.venueId, venueId),
            eq(cashSessions.openedBy, body.operatorId),
            eq(cashSessions.status, 'open')
          )
        )
        .limit(1)
      cashSessionId = activeSession?.id ?? null
    }

    // Insert order
    const itemsDiscountTotal = body.items.reduce((s, i) => s + i.discountAmount, 0)
    const totalDiscountAmount = itemsDiscountTotal + promoDiscount

    const [order] = await db
      .insert(orders)
      .values({
        venueId,
        accountId: body.accountId ?? null,
        orderNumber,
        orderType: 'sale',
        sourceChannel: body.channel,
        currencyCode: 'INR',
        subtotalAmount: itemsSubtotal.toFixed(2),
        discountAmount: totalDiscountAmount.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        status: 'pending',
        createdBy: body.operatorId ?? null,
        notes: body.notes ?? null,
        cashSessionId,
      })
      .returning()

    // Insert order items and capture returned IDs for reservation creation
    const insertedItems: Array<{
      id: string
      productId: string
      quantity: number
      resourceId?: string
      resourceSlotId?: string
      visitorTypeId?: string
      holdId?: string
    }> = []

    for (const item of body.items) {
      const lineTotal = item.unitPrice * item.quantity - item.discountAmount

      const [insertedItem] = await db
        .insert(orderItems)
        .values({
          orderId: order!.id,
          productId: item.productId,
          visitorTypeId: item.visitorTypeId ?? null,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toFixed(2),
          discountAmount: item.discountAmount.toFixed(2),
          taxAmount: (lineTotal * 0.18).toFixed(2),
          totalAmount: lineTotal.toFixed(2),
        })
        .returning()

      insertedItems.push({
        id: insertedItem!.id,
        productId: item.productId,
        quantity: item.quantity,
        ...(item.resourceId !== undefined && { resourceId: item.resourceId }),
        ...(item.resourceSlotId !== undefined && { resourceSlotId: item.resourceSlotId }),
        ...(item.visitorTypeId !== undefined && { visitorTypeId: item.visitorTypeId }),
        ...(item.holdId !== undefined && { holdId: item.holdId }),
      })

      // Release capacity hold if provided
      if (item.holdId) {
        await db
          .update(capacityHolds)
          .set({ status: 'converted', orderId: order!.id })
          .where(eq(capacityHolds.id, item.holdId))
      }
    }

    // Process payments
    let paymentStatus: 'paid' | 'pending' = 'pending'
    let totalPaid = 0

    for (const payment of body.payments) {
      // Handle wallet debit
      if (payment.method === 'wallet' && payment.walletId) {
        const [wallet] = await db
          .select()
          .from(wallets)
          .where(eq(wallets.id, payment.walletId))
          .limit(1)

        if (!wallet) continue

        // Burn bonus first, then real
        const bonusToUse = Math.min(Number(wallet.bonusBalance), payment.amount)
        const realToUse = payment.amount - bonusToUse

        if (bonusToUse > 0) {
          await db.insert(walletTransactions).values({
            walletId: wallet.id,
            txType: 'debit_bonus',
            balanceType: 'bonus_cash',
            amount: bonusToUse.toFixed(2),
            balanceBefore: wallet.bonusBalance,
            balanceAfter: (Number(wallet.bonusBalance) - bonusToUse).toFixed(2),
            description: `Order ${orderNumber}`,
          })
          await db
            .update(wallets)
            .set({
              bonusBalance: (Number(wallet.bonusBalance) - bonusToUse).toFixed(2),
              totalBalance: (Number(wallet.totalBalance) - bonusToUse).toFixed(2),
            })
            .where(eq(wallets.id, wallet.id))
        }

        if (realToUse > 0) {
          await db.insert(walletTransactions).values({
            walletId: wallet.id,
            txType: 'debit_real',
            balanceType: 'real_cash',
            amount: realToUse.toFixed(2),
            balanceBefore: wallet.realBalance,
            balanceAfter: (Number(wallet.realBalance) - realToUse).toFixed(2),
            description: `Order ${orderNumber}`,
          })
          await db
            .update(wallets)
            .set({
              realBalance: (Number(wallet.realBalance) - realToUse).toFixed(2),
              totalBalance: (Number(wallet.totalBalance) - realToUse).toFixed(2),
            })
            .where(eq(wallets.id, wallet.id))
        }
      }

      // Handle gift card redemption
      if (payment.method === 'gift_card' && payment.giftCardCode) {
        const [gc] = await db
          .select()
          .from(giftCards)
          .where(and(eq(giftCards.code, payment.giftCardCode), eq(giftCards.status, 'active')))
          .limit(1)

        if (gc) {
          const deduct = Math.min(Number(gc.currentBalance), payment.amount)
          const newBalance = Number(gc.currentBalance) - deduct

          await db.insert(giftCardTransactions).values({
            giftCardId: gc.id,
            txType: 'redemption',
            amount: deduct.toFixed(2),
            balanceBefore: gc.currentBalance,
            balanceAfter: newBalance.toFixed(2),
          })

          await db
            .update(giftCards)
            .set({
              currentBalance: newBalance.toFixed(2),
              status: newBalance === 0 ? 'redeemed' : 'active',
            })
            .where(eq(giftCards.id, gc.id))
        }
      }

      await db.insert(orderPayments).values({
        orderId: order!.id,
        paymentMethod: payment.method,
        amount: payment.amount.toFixed(2),
        status: 'completed',
      })

      totalPaid += payment.amount
    }

    if (totalPaid >= totalAmount) paymentStatus = 'paid'

    // Update order status
    await db
      .update(orders)
      .set({ status: paymentStatus })
      .where(eq(orders.id, order!.id))

    await db.insert(orderStatusHistory).values({
      orderId: order!.id,
      previousStatus: 'pending',
      newStatus: paymentStatus,
      changedBy: body.operatorId ?? null,
    })

    // Record promo code usage
    if (validatedPromo && promoDiscount > 0) {
      await db.insert(promoCodeUsages).values({
        promoCodeId: validatedPromo.id,
        orderId: order!.id,
        accountId: body.accountId ?? null,
        discountAmount: promoDiscount.toFixed(2),
      })
      await db
        .update(promoCodes)
        .set({ currentUses: validatedPromo.currentUses + 1 })
        .where(eq(promoCodes.id, validatedPromo.id))
    }

    // Create reservation group + reservations for ticket items
    if (paymentStatus === 'paid') {
      const ticketItems = insertedItems.filter((i) => i.resourceId)

      for (const item of ticketItems) {
        // Look up reservation config for this product
        const [config] = await db
          .select()
          .from(productReservationConfig)
          .where(eq(productReservationConfig.productId, item.productId))
          .limit(1)

        const reservationType = item.resourceSlotId ? 'slot_bound' : (config?.reservationType ?? 'duration_bound')
        const usageType = config?.usageType ?? 'single_use'

        // Create a reservation group per order item
        const [rg] = await db
          .insert(reservationGroups)
          .values({ orderItemId: item.id })
          .returning()

        for (let q = 0; q < item.quantity; q++) {
          await db.insert(reservations).values({
            orderItemId: item.id,
            reservationGroupId: rg!.id,
            productId: item.productId,
            resourceId: item.resourceId!,
            resourceSlotId: item.resourceSlotId ?? null,
            visitorTypeId: item.visitorTypeId ?? '00000000-0000-0000-0000-000000000000',
            reservationType,
            usageType,
            status: 'confirmed',
            validFrom: new Date(),
            validUntil: config?.durationMinutes
              ? new Date(Date.now() + config.durationMinutes * 60 * 1000)
              : null,
          })
        }
      }
    }

    // Return the inserted order row directly — it already contains orderNumber
    // which is all the frontend needs to show the success screen.  We avoid a
    // relational `with` query here to keep the hot path simple and reliable.
    return reply.status(HTTP_STATUS.CREATED).send({ success: true, data: order! })
  })

  /**
   * GET /api/v1/orders/:id
   * Returns enriched order detail (items with product/visitor-type names,
   * payments, status history, customer) accessible to all authenticated POS staff.
   */
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [requireVenueHeader] },
    async (request, reply) => {
      const db = resolveDb(request)
      const { id } = request.params

      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, id))
        .limit(1)

      if (!order) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' },
        })
      }

      // Items enriched with product name, code, type and visitor type name
      const itemRows = await db
        .select({
          id:              orderItems.id,
          productId:       orderItems.productId,
          productName:     products.name,
          productCode:     products.code,
          productType:     products.productType,
          visitorTypeId:   orderItems.visitorTypeId,
          visitorTypeName: visitorTypes.name,
          quantity:        orderItems.quantity,
          unitPrice:       orderItems.unitPrice,
          discountAmount:  orderItems.discountAmount,
          taxAmount:       orderItems.taxAmount,
          totalAmount:     orderItems.totalAmount,
          priceOverridden: orderItems.priceOverridden,
        })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .leftJoin(visitorTypes, eq(orderItems.visitorTypeId, visitorTypes.id))
        .where(eq(orderItems.orderId, id))

      // Payments ordered chronologically
      const paymentRows = await db
        .select()
        .from(orderPayments)
        .where(eq(orderPayments.orderId, id))
        .orderBy(asc(orderPayments.createdAt))

      // Status history ordered chronologically
      const historyRows = await db
        .select()
        .from(orderStatusHistory)
        .where(eq(orderStatusHistory.orderId, id))
        .orderBy(asc(orderStatusHistory.changedAt))

      // Customer (if linked)
      let customer = null
      if (order.accountId) {
        const [acct] = await db
          .select({
            id:            accounts.id,
            displayName:   accounts.displayName,
            email:         accounts.email,
            mobileNumber:  accounts.mobileNumber,
          })
          .from(accounts)
          .where(eq(accounts.id, order.accountId))
        customer = acct ?? null
      }

      return reply.send({
        success: true,
        data: {
          ...order,
          customer,
          orderItems:    itemRows,
          orderPayments: paymentRows,
          statusHistory: historyRows,
        },
      })
    }
  )

  /**
   * POST /api/v1/orders/:id/refund
   * Process a refund.
   */
  fastify.post<{ Params: { id: string } }>(
    '/:id/refund',
    { preHandler: [requireVenueHeader] },
    async (request, reply) => {
    const db = resolveDb(request)
      const body = z
        .object({
          reason: z.string(),
          amount: z.number().positive(),
          refundMethod: z.enum(['original', 'wallet', 'cash']).default('original'),
          operatorId: z.string().uuid().optional(),
        })
        .parse(request.body)

      const order = await db.query.orders.findFirst({
        where: eq(orders.id, request.params.id),
      })

      if (!order || order.status === 'refunded') {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: { code: 'INVALID_REFUND', message: 'Cannot refund this order' },
        })
      }

      // Insert refund payment record (negative amount = refund)
      await db.insert(orderPayments).values({
        orderId: order.id,
        paymentMethod: 'cash',
        amount: (-body.amount).toFixed(2),
        status: 'refunded',
      })

      const previousStatus = order.status

      await db
        .update(orders)
        .set({ status: 'refunded' })
        .where(eq(orders.id, order.id))

      await db.insert(orderStatusHistory).values({
        orderId: order.id,
        previousStatus,
        newStatus: 'refunded',
        reason: body.reason,
        changedBy: body.operatorId ?? null,
      })

      return reply.send({ success: true, data: { refunded: body.amount, status: 'refunded' } })
    }
  )

  /**
   * GET /api/v1/orders
   * List orders with filters.
   */
  fastify.get('/', { preHandler: [requireVenueHeader] }, async (request, reply) => {
    const db = resolveDb(request)
    const {
      status,
      channel,
      accountId,
      search,
      dateFrom,
      dateTo,
      page  = '1',
      limit = '20',
    } = request.query as Record<string, string>

    const pageNum  = parseInt(page, 10)
    const pageSize = Math.min(parseInt(limit, 10), 100)
    const offset   = (pageNum - 1) * pageSize
    const venueId  = request.venueId!

    const conditions = [eq(orders.venueId, venueId)]
    if (status)    conditions.push(eq(orders.status, status as any))
    if (channel)   conditions.push(eq(orders.sourceChannel, channel as any))
    if (accountId) conditions.push(eq(orders.accountId, accountId))
    if (search)    conditions.push(ilike(orders.orderNumber, `%${search}%`))
    if (dateFrom)  conditions.push(gte(orders.createdAt, new Date(dateFrom)))
    if (dateTo)    conditions.push(lte(orders.createdAt, new Date(`${dateTo}T23:59:59`)))

    const where = and(...conditions)

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(orders)
        .where(where)
        .orderBy(sql`${orders.createdAt} DESC`)
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(orders)
        .where(where),
    ])

    const total = countResult[0]?.count ?? 0

    return reply.send({
      success: true,
      data: rows,
      meta: { page: pageNum, limit: pageSize, total },
    })
  })
}
