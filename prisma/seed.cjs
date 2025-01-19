// prisma/seed.ts
const { PrismaClient, SubscriptionStatus, PaymentStatus } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Clean existing data
  await prisma.$transaction([
    prisma.paymentTransaction.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.servicePlan.deleteMany(),
    prisma.serviceProvider.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // Create service providers with expanded list
  const providers = await Promise.all([
    prisma.serviceProvider.create({
      data: {
        name: 'Netflix',
        apiKey: 'netflix_api_key_123',
        apiUrl: 'https://api.netflix.com',
        isActive: true,
      },
    }),
    prisma.serviceProvider.create({
      data: {
        name: 'Spotify',
        apiKey: 'spotify_api_key_456',
        apiUrl: 'https://api.spotify.com',
        isActive: true,
      },
    }),
    prisma.serviceProvider.create({
      data: {
        name: 'HBO Max',
        apiKey: 'hbo_api_key_789',
        apiUrl: 'https://api.hbomax.com',
        isActive: true,
      },
    }),
    prisma.serviceProvider.create({
      data: {
        name: 'Disney+',
        apiKey: 'disney_api_key_101',
        apiUrl: 'https://api.disneyplus.com',
        isActive: true,
      },
    }),
    prisma.serviceProvider.create({
      data: {
        name: 'Amazon Prime',
        apiKey: 'amazon_api_key_102',
        apiUrl: 'https://api.amazon.com',
        isActive: true,
      },
    }),
    prisma.serviceProvider.create({
      data: {
        name: 'Apple TV+',
        apiKey: 'apple_api_key_103',
        apiUrl: 'https://api.apple.com',
        isActive: true,
      },
    }),
    prisma.serviceProvider.create({
      data: {
        name: 'YouTube Premium',
        apiKey: 'youtube_api_key_104',
        apiUrl: 'https://api.youtube.com',
        isActive: true,
      },
    }),
    prisma.serviceProvider.create({
      data: {
        name: 'Xbox Game Pass',
        apiKey: 'xbox_api_key_105',
        apiUrl: 'https://api.xbox.com',
        isActive: true,
      },
    }),
  ]);

  // Enhanced plan data for all providers
  const planData = {
    Netflix: [
      { name: 'Basic', priceUSD: 1500, externalPlanId: 'netflix_basic' },
      { name: 'Standard', priceUSD: 2400, externalPlanId: 'netflix_standard' },
      { name: 'Premium', priceUSD: 3000, externalPlanId: 'netflix_premium' },
    ],
    Spotify: [
      { name: 'Individual', priceUSD: 999, externalPlanId: 'spotify_individual' },
      { name: 'Duo', priceUSD: 1499, externalPlanId: 'spotify_duo' },
      { name: 'Family', priceUSD: 2499, externalPlanId: 'spotify_family' },
    ],
    'HBO Max': [
      { name: 'With Ads', priceUSD: 1199, externalPlanId: 'hbo_with_ads' },
      { name: 'Ad-Free', priceUSD: 2099, externalPlanId: 'hbo_ad_free' },
      { name: 'Premium', priceUSD: 2499, externalPlanId: 'hbo_premium' },
    ],
    'Disney+': [
      { name: 'Basic', priceUSD: 799, externalPlanId: 'disney_basic' },
      { name: 'Premium', priceUSD: 1399, externalPlanId: 'disney_premium' },
      { name: 'Bundle', priceUSD: 1999, externalPlanId: 'disney_bundle' },
    ],
    'Amazon Prime': [
      { name: 'Monthly', priceUSD: 1499, externalPlanId: 'prime_monthly' },
      { name: 'Annual', priceUSD: 13900, externalPlanId: 'prime_annual' },
      { name: 'Student', priceUSD: 749, externalPlanId: 'prime_student' },
    ],
    'Apple TV+': [
      { name: 'Monthly', priceUSD: 699, externalPlanId: 'appletv_monthly' },
      { name: 'Annual', priceUSD: 6900, externalPlanId: 'appletv_annual' },
      { name: 'Apple One', priceUSD: 1695, externalPlanId: 'apple_one' },
    ],
    'YouTube Premium': [
      { name: 'Individual', priceUSD: 1199, externalPlanId: 'youtube_individual' },
      { name: 'Family', priceUSD: 2299, externalPlanId: 'youtube_family' },
      { name: 'Student', priceUSD: 699, externalPlanId: 'youtube_student' },
    ],
    'Xbox Game Pass': [
      { name: 'Console', priceUSD: 999, externalPlanId: 'xbox_console' },
      { name: 'PC', priceUSD: 999, externalPlanId: 'xbox_pc' },
      { name: 'Ultimate', priceUSD: 1499, externalPlanId: 'xbox_ultimate' },
    ],
  };

  // Create service plans
  const plans = await Promise.all(
    providers.flatMap((provider) =>
      (planData[provider.name] || []).map((plan) =>
        prisma.servicePlan.create({
          data: {
            providerId: provider.id,
            name: plan.name,
            externalPlanId: plan.externalPlanId,
            priceUSD: plan.priceUSD,
            features: {
              description: `${provider.name} ${plan.name} Plan`,
              benefits: [
                `Full access to ${provider.name} content`,
                `${plan.name} tier features`,
                'HD streaming quality',
                'Cancel anytime',
              ],
            },
            isActive: true,
          },
        })
      )
    )
  );

  // Create mock users with transaction history
  const users = await Promise.all([
    prisma.user.create({
      data: {
        walletAddress: '0x1234567890123456789012345678901234567890',
        email: 'user1@example.com',
      },
    }),
    prisma.user.create({
      data: {
        walletAddress: '0x2345678901234567890123456789012345678901',
        email: 'user2@example.com',
      },
    }),
    prisma.user.create({
      data: {
        walletAddress: '0x3456789012345678901234567890123456789012',
        email: 'user3@example.com',
      },
    }),
  ]);

  // Function to generate mock transaction hash
  const generateTxHash = () => `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

  // Create subscriptions with different statuses and transaction history
  const subscriptions = await Promise.all(
    plans.map((plan, index) => {
      const user = users[index % users.length];
      const virtualCardId = `vc_${Math.random().toString(36).substr(2, 9)}`;
      const cardHash = generateTxHash();
      const txHash = generateTxHash();

      return prisma.subscription.create({
        data: {
          userId: user.id,
          providerId: plan.providerId,
          planId: plan.id,
          status: index % 4 === 0 ? SubscriptionStatus.PAYMENT_PENDING : SubscriptionStatus.ACTIVE,
          virtualCardId,
          cardHash,
          externalSubId: `sub_${Math.random().toString(36).substr(2, 9)}`,
          lastPriceUSD: plan.priceUSD,
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lastBillingDate: new Date(),
          autoRenew: true,
          metadata: {
            lastSync: new Date().toISOString(),
            userPreferences: {},
            transactionHistory: [
              {
                txHash,
                timestamp: new Date().toISOString(),
                type: 'SUBSCRIPTION_CREATION',
              },
            ],
          },
        },
      });
    })
  );

  // Create payment transactions with full history
  await Promise.all(
    subscriptions.flatMap((sub) => {
      const txHash = generateTxHash();
      const pastPayments = Array.from({ length: 3 }, (_, i) => ({
        subscriptionId: sub.id,
        amountUSD: sub.lastPriceUSD,
        amountToken: '1000000000000000000', // 1 ETH in wei
        tokenAddress: '0x0000000000000000000000000000000000000000',
        txHash: generateTxHash(),
        status: PaymentStatus.COMPLETED,
        createdAt: new Date(Date.now() - (i + 1) * 30 * 24 * 60 * 60 * 1000), // Past payments
        updatedAt: new Date(Date.now() - (i + 1) * 30 * 24 * 60 * 60 * 1000),
      }));

      return [
        ...pastPayments.map((payment) => prisma.paymentTransaction.create({ data: payment })),
        prisma.paymentTransaction.create({
          data: {
            subscriptionId: sub.id,
            amountUSD: sub.lastPriceUSD,
            amountToken: '1000000000000000000',
            tokenAddress: '0x0000000000000000000000000000000000000000',
            txHash,
            status: PaymentStatus.COMPLETED,
          },
        }),
      ];
    })
  );

  console.log('Enhanced seed data created successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });