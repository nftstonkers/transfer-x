import {SimpleSmartAccountOwner} from "@alchemy/aa-core";

export interface KernelAccountOwner extends SimpleSmartAccountOwner {
    /***
     * Implements 2 inherited methods
     *   signMessage: (msg: Uint8Array) => Promise<Address>;
     *   getAddress: () => Promise<Address>;
     */
}