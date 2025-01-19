// services/subscriptionService.ts
import { PrismaClient, SubscriptionStatus, PaymentStatus } from '@prisma/client';
import { ethers } from 'ethers';
import { contract } from '../utils/web3Provider';

const prisma = new PrismaClient();

export interface SubscriptionWithDetails {
  id: number;
  name: string;
  amount: string;
  status: string;
  nextPayment: string;
  hasPendingPayment?: boolean;
  pendingReason?: string;
  transactionHash?: string;
}

export interface CreateSubscriptionDTO {
  userId: number;
  providerId: number;
  planId: number;
  virtualCardId: string;
  walletAddress: string;
}

export class SubscriptionService {
  private static async createSmartContractSubscription(
    userId: number,
    providerId: number,
    planId: number,
    priceUSD: number,
    walletAddress: string
  ): Promise<string> {
    try {
      // Convert USD price to Wei (assuming 1 ETH = $3000 for example)
      const ethPrice = priceUSD / 3000;
      const weiPrice = ethers.parseEther(ethPrice.toString());

      const tx = await contract.subscribe(
        userId,
        providerId,
        planId,
        weiPrice,
        {
          from: walletAddress,
          value: weiPrice // If paying in ETH
        }
      );

      const receipt = await tx.wait();
      return receipt.transactionHash;
    } catch (error) {
      console.error('Smart Contract Error:', error);
      throw new Error('Failed to create subscription on-chain');
    }
  }

  static async createSubscription(data: CreateSubscriptionDTO): Promise<SubscriptionWithDetails> {
    const { userId, providerId, planId, virtualCardId, walletAddress } = data;

    // Start transaction
    const result = await prisma.$transaction(async (prisma) => {
      // Verify provider and plan
      const provider = await prisma.serviceProvider.findUnique({
        where: { id: providerId },
      });

      if (!provider || !provider.isActive) {
        throw new Error('Service provider not found or inactive');
      }

      const plan = await prisma.servicePlan.findUnique({
        where: { id: planId },
      });

      if (!plan || !plan.isActive) {
        throw new Error('Plan not found or inactive');
      }

      // Create smart contract subscription
      const transactionHash = await this.createSmartContractSubscription(
        userId,
        providerId,
        planId,
        plan.priceUSD,
        walletAddress
      );

      // Create virtual card hash
      const cardHash = ethers.keccak256(
        ethers.toUtf8Bytes(virtualCardId)
      );

      // Create subscription in database
      const subscription = await prisma.subscription.create({
        data: {
          userId,
          providerId,
          planId,
          status: SubscriptionStatus.ACTIVE,
          virtualCardId,
          cardHash,
          lastPriceUSD: plan.priceUSD,
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          autoRenew: true,
          metadata: {
            transactionHash,
            createdOnChain: true,
          },
        },
        include: {
          provider: true,
          plan: true,
        },
      });

      // Create initial payment transaction
      await prisma.paymentTransaction.create({
        data: {
          subscriptionId: subscription.id,
          amountUSD: plan.priceUSD,
          amountToken: ethers.parseEther((plan.priceUSD / 3000).toString()).toString(),
          tokenAddress: '0x0000000000000000000000000000000000000000', // ETH address
          txHash: transactionHash,
          status: PaymentStatus.COMPLETED,
        },
      });

      return {
        id: subscription.id,
        name: `${provider.name} ${plan.name}`,
        amount: `$${(plan.priceUSD / 100).toFixed(2)}`,
        status: subscription.status,
        nextPayment: subscription.nextBillingDate.toLocaleDateString(),
        transactionHash,
      };
    });

    return result;
  }

  static async getUserSubscriptions(userId: number): Promise<SubscriptionWithDetails[]> {
    const subscriptions = await prisma.subscription.findMany({
      where: { userId },
      include: {
        plan: true,
        provider: true,
      },
    });

    return subscriptions.map((sub) =>
      id: sub.id,
      name: `${sub.provider.name} ${sub.plan.name}`,
      amount: `$${(sub.lastPriceUSD / 100).toFixed(2)}`,
      status: sub.status,
      nextPayment: sub.nextBillingDate.toLocaleDateString(),
      hasPendingPayment: sub.status === SubscriptionStatus.PAYMENT_PENDING,
      pendingReason: sub.status === SubscriptionStatus.PAYMENT_PENDING 
        ? 'Payment verification in progress' 
        : undefined,
      transactionHash: transact
    }));
  }

  static async cancelSubscription(id: number, walletAddress: string): Promise<void> {
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: { plan: true },
    });

    if (!subscription) throw new Error('Subscription not found');

    try {
      // Cancel on blockchain first
      const tx = await contract.cancelSubscription(
        subscription.id,
        {
          from: walletAddress,
        }
      );
      const receipt = await tx.wait();

      // Update database
      await prisma.subscription.update({
        where: { id },
        data: {
          status: SubscriptionStatus.CANCELLED,
          cancelledAt: new Date(),
          autoRenew: false,
          metadata: {
            ...subscription.metadata,
            cancelTransactionHash: receipt.transactionHash,
          },
        },
      });
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      throw new Error('Failed to cancel subscription on-chain');
    }
  }

  static async upgradePlan(
    id: number,
    newPlanId: number,
    walletAddress: string
  ): Promise<void> {
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: { plan: true },
    });

    if (!subscription) throw new Error('Subscription not found');

    const newPlan = await prisma.servicePlan.findUnique({
      where: { id: newPlanId },
    });

    if (!newPlan) throw new Error('New plan not found');

    try {
      // Upgrade on blockchain first
      const tx = await contract.upgradePlan(
        subscription.id,
        newPlanId,
        newPlan.priceUSD,
        {
          from: walletAddress,
        }
      );
      const receipt = await tx.wait();

      // Update database
      await prisma.subscription.update({
        where: { id },
        data: {
          planId: newPlanId,
          lastPriceUSD: newPlan.priceUSD,
          metadata: {
            ...subscription.metadata,
            upgradeTransactionHash: receipt.transactionHash,
          },
        },
      });
    } catch (error) {
      console.error('Failed to upgrade plan:', error);
      throw new Error('Failed to upgrade plan on-chain');
    }
  }

  static async resolvePaymentPending(id: number): Promise<void> {
    await prisma.subscription.update({
      where: { id },
      data: {
        status: SubscriptionStatus.ACTIVE,
      },
    });
  }
}