

import axios from 'axios';
import { CRYPTO_CONFIG } from '../config/cryptoConfig';


interface VerificationResult {
    verified: boolean;
    status: string;
    message?: string;
    txHash?: string;
    amount?: number;
    confirmations?: number;
    timestamp?: number;
    explorerUrl?: string;
}

interface BlockchainConfig {
    apiUrl: string;
    apiKey: string;
    explorerUrl: string;
    decimals: number;
    minConfirmations: number;
    usdtContract?: string;
    webhookUrl?: string;
}

interface BlockchainConfigs {
    [key: string]: BlockchainConfig;
}

export class BlockchainService {
    private readonly config: BlockchainConfigs = {
            BTC: {
                apiUrl: 'https://api.blockcypher.com/v1/btc/main',
                apiKey: process.env.BLOCKCYPHER_API_TOKEN!,
                explorerUrl: 'https://www.blockchain.com/btc/tx/',
                decimals: 8,
                minConfirmations: 2,
                webhookUrl: `https://api.blockcypher.com/v1/btc/main/hooks?token=${process.env.BLOCKCYPHER_API_TOKEN!}`
            },
            LTC: {
                apiUrl: 'https://api.blockcypher.com/v1/ltc/main',
                apiKey: process.env.BLOCKCYPHER_API_TOKEN!,
                explorerUrl: 'https://blockchair.com/litecoin/transaction/',
                decimals: 8,
                minConfirmations: 6
            },
            DOGE: {
                apiUrl: 'https://api.blockcypher.com/v1/doge/main',
                apiKey: process.env.BLOCKCYPHER_API_TOKEN!,
                explorerUrl: 'https://dogechain.info/tx/',
                decimals: 8,
                minConfirmations: 6
            },
            SOL: {
                apiUrl: 'https://api.solscan.io',
                apiKey: process.env.SOLSCAN_API_KEY!,
                explorerUrl: 'https://solscan.io/tx/',
                decimals: 9,
                minConfirmations: 1
            },
            USDT: {
                apiUrl: 'https://api.trongrid.io',
                apiKey: process.env.TRONGRID_API_KEY!,
                explorerUrl: 'https://tronscan.org/#/transaction/',
                decimals: 6,
                minConfirmations: 19,
                usdtContract: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
            }
    };

    private currentOrderId: string | null = null;

    async registerWebhook(address: string, currency: string, orderId: string): Promise<void> {
        const config = this.config[currency.toUpperCase()];
        if (!config) throw new Error(`Unsupported currency: ${currency}`);

        const webhookData = {
            events: ['tx-confirmation', 'unconfirmed-tx'],
            address,
            url: `https://fef0-2409-40c4-3003-b00c-bf8f-b7d2-60c0-1fae.ngrok-free.app/webhooks/blockcypher?orderId=${orderId}`,
            token: config.apiKey
        };
        console.log("🚀 ~ BlockchainService ~ registerWebhook ~ webhookData:", webhookData)

        const data = await axios.post(`${config.apiUrl}/hooks`, webhookData);
        // console.log("🚀 ~ BlockchainService ~ registerWebhook ~ data:", data)
        this.currentOrderId = orderId;
        console.log("🚀 ~ BlockchainService ~ registerWebhook ~ this.currentOrderId :", this.currentOrderId)
    }

    getCurrentOrderId(): string | null {
        return this.currentOrderId;
    }



    async listWebhooks(currency: string): Promise<any> {
        const config = this.config[currency.toUpperCase()];
        if (!config) throw new Error(`Unsupported currency: ${currency}`);

        const response = await axios.get(`${config.apiUrl}/hooks?token=${config.apiKey}`);
        // console.log("🚀 ~ BlockchainService ~ listWebhooks ~ response:", response)
        return response.data;
  
    }

    async deleteAllWebhooks(currency: string): Promise<void> {
        const config = this.config[currency.toUpperCase()];
        if (!config) throw new Error(`Unsupported currency: ${currency}`);

        const webhooks = await this.listWebhooks(currency);
        for (const webhook of webhooks) {
            await this.deleteWebhook(webhook.id, currency);
        }
    }

    async deleteWebhook(webhookId: string, currency: string): Promise<void> {
        try {
            const config = this.config[currency.toUpperCase()];
            if (!config) throw new Error(`Unsupported currency: ${currency}`);

            await axios.delete(`${config.apiUrl}/hooks/${webhookId}?token=${config.apiKey}`);
        } catch (error) {
            console.error('Error deleting webhook:', error);
            throw error;
        }
    }

    async verifyOtherCryptocurrencies(currency: string, payment_address: string, orderId: string): Promise<void> {
        switch (currency) {
            case 'USDT':
                // Add verification logic for USDT
                console.log(`Verifying USDT address: ${payment_address} for order: ${orderId}`);
                break;
            case 'TRX':
                // Add verification logic for TRX
                console.log(`Verifying TRX address: ${payment_address} for order: ${orderId}`);
                break;
            case 'XMR':
                // Add verification logic for XMR
                console.log(`Verifying XMR address: ${payment_address} for order: ${orderId}`);
                break;
            case 'SOL':
                // Add verification logic for SOL
                console.log(`Verifying SOL address: ${payment_address} for order: ${orderId}`);
                break;
            default:
                throw new Error(`Unsupported currency: ${currency}`);
        }
    }

        async getPaymentByAddress(address: string, currency: string): Promise<VerificationResult> {
            const config = this.config[currency.toUpperCase()];
            if (!config) throw new Error(`Unsupported currency: ${currency}`);

            switch (currency.toUpperCase()) {
                case 'BTC':
                case 'LTC':
                case 'DOGE':
                    return await this.verifyUTXOTransaction(currency, address, config);

                case 'SOL':
                    return await this.verifySolanaTransaction(address, config);

                case 'USDT':
                    return await this.verifyTronTransaction(address, config);

                default:
                    throw new Error(`Verification not implemented for ${currency}`);
            }
        }

        private async verifyUTXOTransaction(currency: string, address: string, config: BlockchainConfig): Promise<VerificationResult> {
            // This method will be triggered by the webhook, so it doesn't need to call the API directly
            return {
                verified: false,
                status: 'pending',
                message: 'Waiting for webhook notification'
            };
        }

        private async verifySolanaTransaction(address: string, config: BlockchainConfig): Promise<VerificationResult> {
            const response = await axios.get(`${config.apiUrl}/account/transactions`, {
                params: { account: address },
                headers: { 'Authorization': `Bearer ${config.apiKey}` }
            });

            const recentTx = response.data?.[0];
            if (!recentTx) return { verified: false, status: 'pending' };

            return {
                verified: recentTx.confirmations >= config.minConfirmations,
                status: recentTx.confirmations >= config.minConfirmations ? 'completed' : 'pending',
                txHash: recentTx.signature,
                amount: recentTx.lamports / Math.pow(10, config.decimals),
                confirmations: recentTx.confirmations,
                timestamp: recentTx.blockTime * 1000,
                explorerUrl: `${config.explorerUrl}${recentTx.signature}`
            };
        }

        private async verifyTronTransaction(address: string, config: BlockchainConfig): Promise<VerificationResult> {
            const response = await axios.get(`${config.apiUrl}/v1/accounts/${address}/transactions/trc20`, {
                params: {
                    contract_address: config.usdtContract,
                    only_confirmed: true,
                    limit: 1
                },
                headers: { 'TRON-PRO-API-KEY': config.apiKey }
            });

            const recentTx = response.data.data?.[0];
            if (!recentTx) return { verified: false, status: 'pending' };

            return {
                verified: parseInt(recentTx.value) >= 0,
                status: parseInt(recentTx.value) >= 0 ? 'completed' : 'pending',
                txHash: recentTx.transaction_id,
                amount: parseInt(recentTx.value) / Math.pow(10, config.decimals),
                confirmations: recentTx.confirmed ? config.minConfirmations : 0,
                timestamp: recentTx.block_timestamp,
                explorerUrl: `${config.explorerUrl}${recentTx.transaction_id}`
            };
        }
}