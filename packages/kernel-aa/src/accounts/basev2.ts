import {FallbackTransport, Transport} from "viem";
import {Address} from "abitype";
import {BaseSmartContractAccount, UserOperationStruct} from "@alchemy/aa-core";
import {KernelAccountOwner} from "./owner-interfaces/kernel";
import {AccountDeploymentState, BaseV2AccountParams} from "./params/basev2";

export abstract class Basev2SmartContractAccount<
    TTransport extends Transport | FallbackTransport = Transport
> extends BaseSmartContractAccount<TTransport> {
    protected owner: KernelAccountOwner;
    protected factoryAddress: Address;
    protected index: bigint;

    private deployed: AccountDeploymentState = AccountDeploymentState.not_defined;


    constructor(params: BaseV2AccountParams) {
        super(params);
        this.index = params.index ?? 0n;
        this.owner = params.owner;
        this.factoryAddress = params.factoryAddress;
        this.isAccountDeployed()
    }


    //Use this method to perform initial safety checks while initialization
    async initChecks(): Promise<this> {
        await this.rpcProvider.getContractCode(
            await this.getAddress()
        );
        if (await this.rpcProvider.getContractCode(this.entryPointAddress)=== '0x') {
            throw new Error(`entryPoint not deployed at ${this.entryPointAddress}`)
        }

        await this.getAddress()
        return this
    }


    getDummySignature(): `0x${string}` {
        return "0x4046ab7d9c387d7a5ef5ca0777eded29767fd9863048946d35b3042d2f7458ff7c62ade2903503e15973a63a296313eab15b964a18d79f4b06c8c01c7028143c1c";
    }


    async getNonce(): Promise<bigint> {
        if (!await this.isAccountDeployed()) {
            return 0n;
        }
        const address = await this.getAddress();
        return this.entryPoint.read.getNonce([address, BigInt(0)]);
    }

    async getUserOpHash (userOp: UserOperationStruct): Promise<string> {
        const response = await this.entryPoint.simulate.getUserOpHash([userOp])
        return response.result;
    }


    // Extra implementations
    async isAccountDeployed(): Promise<Boolean> {
        return await this.getDeploymentState()  === AccountDeploymentState.deployed
    }

    async getDeploymentState(): Promise<AccountDeploymentState> {
        if(this.deployed === AccountDeploymentState.not_defined) {
            const initCode = await this.getInitCode();
            this.deployed =  (initCode === "0x") ? AccountDeploymentState.deployed : AccountDeploymentState.not_deployed
        }
        return this.deployed
    }





}