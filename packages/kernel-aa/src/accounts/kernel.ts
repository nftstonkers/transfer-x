import {
    concatHex,
    encodeFunctionData,
    hexToBytes,
    type FallbackTransport,
    type Hex,
    type Transport, toBytes, decodeFunctionData,
} from "viem";
import {KernelAccountAbi} from "../abis/KernelAccountAbi.js";
import {encodeAbiParameters, parseAbiParameters} from 'viem'


import {ECDSAKernelFactoryAbi} from "../abis/ECDSAKernelFactory";
import {Basev2SmartContractAccount} from "./basev2";
import {ValidatorMode} from "../validators/base";
import {UserOperationStruct} from "@alchemy/aa-core";
import {KernelAccountParams} from "./params/kernel";
import {whitelistedKernelAccounts, whiteListedKernelFactories} from "../utils/abi";


export class KernelSmartContractAccount<
    TTransport extends Transport | FallbackTransport = Transport
> extends Basev2SmartContractAccount<TTransport> {

    validator


    accountFactoryAbi?: string;
    accountAbi: string;

    constructor(params: KernelAccountParams) {
        super(params);
        this.accountFactoryAbi = params.accountFactoryAbi;
        this.accountAbi = params.accountAbi;
        this.validator = params.validator

    }

    async encodeExecute(target: Hex, value: bigint, data: Hex): Promise<`0x${string}`> {
        if (target.toLowerCase() === this.accountAddress?.toLowerCase() && this.validator?.mode !== ValidatorMode.sudo) {
            return Promise.resolve(data)
        } else {
            return Promise.resolve(this.encodeExecuteAction(target, value, data, 0));
        }
    }

    async encodeExecuteDelegate(target: Hex, value: bigint, data: Hex): Promise<`0x${string}`> {
        return Promise.resolve(this.encodeExecuteAction(target, value, data, 1));
    }

    async decodeExecuteDelegate(data: `0x${string}`): Promise<Array<any>> {
        return decodeFunctionData({
            abi: KernelAccountAbi,
            data: data,
        });
    }

    async signUserOp(userOp: UserOperationStruct): Promise<UserOperationStruct> {
        const signature = await this.validator.getSignature(userOp)
        return {
            ...userOp,
            signature
        }
    }

    async signUserOpHash(userOpHash: string): Promise<string> {
        return await this.validator.signMessage(toBytes(userOpHash))
    }

    async signMessage(msg: string | Uint8Array | Hex): Promise<`0x${string}`> {
        if (typeof msg === "string" && msg.startsWith("0x")) {
            msg = hexToBytes(msg as Hex);
        } else if (typeof msg === "string") {
            msg = new TextEncoder().encode(msg);
        }
        let sig = await this.validator.signMessage(msg);

        // If the account is undeployed, use ERC-6492
        if (!await this.isAccountDeployed()) {
            sig = encodeAbiParameters(
                parseAbiParameters('address, bytes, bytes'),
                [this.factoryAddress,
                    await this.getFactoryAccountInitCode(),
                    sig
                ]
            ) + '6492649264926492649264926492649264926492649264926492649264926492' // magic suffix
        }

        return Promise.resolve(sig)

    }


    protected encodeExecuteAction(target, value, data, code): `0x${string}` {
        switch (whitelistedKernelAccounts[this.accountAbi]) {
            case KernelAccountAbi: {
                return encodeFunctionData({
                    abi: KernelAccountAbi,
                    functionName: "execute",
                    args: [target, value, data, code],
                });
            }
            default:
                return "0x"
        }
    }

    protected async getAccountInitCode(): Promise<`0x${string}`> {
        return concatHex([
            this.factoryAddress,
            await this.getFactoryAccountInitCode(),
        ]);
    }

    protected async getFactoryAccountInitCode(): Promise<`0x${string}`> {
        switch (whiteListedKernelFactories[this.accountFactoryAbi]) {
            case ECDSAKernelFactoryAbi: {
                return encodeFunctionData({
                    abi: ECDSAKernelFactoryAbi,
                    functionName: "createAccount",
                    args: [await this.owner.getAddress(), this.index],
                })
            }
            default:
                return "0x"

        }
    }

}