/**
 * Client-side Poseidon Merkle Tree
 * Mirrors the Cairo CredentialMerkle contract's logic
 * Used for generating Merkle proofs off-chain
 */

import { hash } from "starknet";

const TREE_DEPTH = 20;

function poseidonHash(left: bigint, right: bigint): bigint {
  const result = hash.computePoseidonHashOnElements([left, right]);
  return BigInt(result);
}

/**
 * Precompute zero hashes for each level (same as Cairo contract constructor)
 */
function computeZeroHashes(): bigint[] {
  const zeros: bigint[] = [0n]; // Level 0 zero = 0
  for (let i = 1; i <= TREE_DEPTH; i++) {
    zeros.push(poseidonHash(zeros[i - 1], zeros[i - 1]));
  }
  return zeros;
}

const ZERO_HASHES = computeZeroHashes();

export class MerkleTree {
  private leaves: bigint[] = [];
  private nodes: Map<string, bigint> = new Map(); // "level,index" -> hash

  /**
   * Insert a leaf and update the tree
   */
  insert(commitment: bigint): number {
    const index = this.leaves.length;
    this.leaves.push(commitment);
    this.nodes.set(`0,${index}`, commitment);

    // Update path from leaf to root
    let currentHash = commitment;
    let currentIndex = index;

    for (let level = 0; level < TREE_DEPTH; level++) {
      const parentIndex = Math.floor(currentIndex / 2);
      const isLeft = currentIndex % 2 === 0;

      let left: bigint, right: bigint;
      if (isLeft) {
        const rightKey = `${level},${currentIndex + 1}`;
        const rightSibling = this.nodes.get(rightKey);
        left = currentHash;
        right = rightSibling ?? ZERO_HASHES[level];
      } else {
        const leftKey = `${level},${currentIndex - 1}`;
        const leftSibling = this.nodes.get(leftKey)!;
        left = leftSibling;
        right = currentHash;
      }

      currentHash = poseidonHash(left, right);
      this.nodes.set(`${level + 1},${parentIndex}`, currentHash);
      currentIndex = parentIndex;
    }

    return index;
  }

  /**
   * Get the current root
   */
  getRoot(): bigint {
    if (this.leaves.length === 0) {
      return ZERO_HASHES[TREE_DEPTH];
    }
    return this.nodes.get(`${TREE_DEPTH},0`) ?? ZERO_HASHES[TREE_DEPTH];
  }

  /**
   * Generate a Merkle inclusion proof for a given leaf index
   */
  generateProof(leafIndex: number): bigint[] {
    if (leafIndex >= this.leaves.length) {
      throw new Error(`Leaf index ${leafIndex} out of bounds`);
    }

    const proof: bigint[] = [];
    let currentIndex = leafIndex;

    for (let level = 0; level < TREE_DEPTH; level++) {
      const isLeft = currentIndex % 2 === 0;
      const siblingIndex = isLeft ? currentIndex + 1 : currentIndex - 1;
      const siblingKey = `${level},${siblingIndex}`;
      const sibling = this.nodes.get(siblingKey) ?? ZERO_HASHES[level];
      proof.push(sibling);
      currentIndex = Math.floor(currentIndex / 2);
    }

    return proof;
  }

  /**
   * Verify a Merkle proof
   */
  static verifyProof(
    leaf: bigint,
    proof: bigint[],
    index: number,
    root: bigint
  ): boolean {
    if (proof.length !== TREE_DEPTH) return false;

    let currentHash = leaf;
    let currentIndex = index;

    for (let level = 0; level < TREE_DEPTH; level++) {
      const sibling = proof[level];
      const isLeft = currentIndex % 2 === 0;

      currentHash = isLeft
        ? poseidonHash(currentHash, sibling)
        : poseidonHash(sibling, currentHash);

      currentIndex = Math.floor(currentIndex / 2);
    }

    return currentHash === root;
  }

  /**
   * Get the number of leaves
   */
  getLeafCount(): number {
    return this.leaves.length;
  }
}

export { TREE_DEPTH, ZERO_HASHES };
