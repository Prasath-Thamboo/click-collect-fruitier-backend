const cron = require('node-cron');
const { prisma } = require('./lib/prisma');

function startScheduler() {
  // Every day at 8:00 AM — generate orders for active subscriptions scheduled today
  cron.schedule('0 8 * * *', async () => {
    try {
      const today = new Date();
      const dayOfWeek = today.getDay();

      const subscriptions = await prisma.subscription.findMany({
        where: {
          status: 'ACTIVE',
          schedules: { some: { dayOfWeek } },
        },
        include: {
          items: true,
          schedules: { where: { dayOfWeek } },
        },
      });

      let created = 0;
      for (const sub of subscriptions) {
        for (const schedule of sub.schedules) {
          const [hour, minute] = schedule.pickupTime.split(':').map(Number);
          const pickupDate = new Date(today);
          pickupDate.setHours(hour, minute, 0, 0);

          const perOrderTotal = sub.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
          const discountedTotal = Math.round(perOrderTotal * (1 - sub.discountPercent / 100) * 100) / 100;

          await prisma.order.create({
            data: {
              userId: sub.userId,
              storeId: sub.storeId,
              subscriptionId: sub.id,
              totalAmount: discountedTotal,
              pickupDate,
              status: 'PENDING',
              items: {
                create: sub.items.map((item) => ({
                  productId: item.productId,
                  quantity: item.quantity,
                  unitPrice: Math.round(item.unitPrice * (1 - sub.discountPercent / 100) * 100) / 100,
                })),
              },
            },
          });
          created++;
        }
      }

      console.log(`[Scheduler] ${created} orders generated from ${subscriptions.length} subscriptions`);
    } catch (error) {
      console.error('[Scheduler] Error:', error);
    }
  });

  console.log('[Scheduler] Subscription scheduler started (runs daily at 08:00)');
}

module.exports = { startScheduler };
