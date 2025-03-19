import { ethers } from 'ethers';

const ABI = [
    {
        inputs: [],
        name: 'getAddresses',
        outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
        stateMutability: 'view',
        type: 'function',
    },
];

/**
 * Wrapper for on-chain registry contract that manages the current set of participants.
 * Note, that there are separate instances for solvers and validators.
 */
export class Registry {
    contract;

    /**
     * Creates a new registry instance.
     *
     * @param rpc the RPC provider
     * @param address the address of the deployed registry contract
     */
    constructor(rpc: ethers.ContractRunner, address: string) {
        this.contract = new ethers.Contract(address, ABI, rpc);
    }

    /**
     * Retrieve the current set of participants.
     *
     * @returns the list of participants
     */
    public async getAddresses(): Promise<string[]> {
        return await this.contract.getAddresses();
    }
}
