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

export class Registry {
    contract;

    constructor(rpc: ethers.ContractRunner, address: string) {
        this.contract = new ethers.Contract(address, ABI, rpc);
    }

    async getAddresses() {
        return await this.contract.getAddresses();
    }
}
