/*
Copyright 2020 OmiseGO Pte Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License. */

// https://github.com/omisego/plasma-contracts/blob/master/plasma_framework/test/helpers/merkle.js

import web3Utils from 'web3-utils';

/** @internal */
class MerkleNode {
  public data;
  public left;
  public right;

  public constructor (data, left = null, right = null) {
    this.data = data;
    this.left = left;
    this.right = right;
  }
}

/** @internal */
class MerkleTree {
  private readonly NodeSalt = '0x01';
  private readonly NullHash = web3Utils.sha3('\0'.repeat(33));

  public height;
  public leafCount;
  public leaves;
  public tree;
  public root;

  public constructor (leaves: Array<string>, height = 0) {
    const minHeightForLeaves = leaves.length === 1
      ? 1
      : parseInt(Math.ceil(Math.log2(leaves.length)).toString(), 10);

    if (height === 0) {
      this.height = minHeightForLeaves;
    } else if (height > minHeightForLeaves) {
      this.height = height;
    } else {
      throw new Error(
        `height should be at least ${minHeightForLeaves} for the list of leaves`
      );
    }

    this.leafCount = 2 ** this.height;

    this.leaves = leaves.map(MerkleTree.hashLeaf);

    const fill = Array.from({ length: this.leafCount - this.leaves.length }, () => this.NullHash);
    this.leaves = this.leaves.concat(fill);
    this.tree = [MerkleTree.createNodes(this.leaves)];
    this.root = this.createTree(this.tree[0]);
  }

  static hashLeaf (leaf: string): string {
    return web3Utils.sha3('0x00' + leaf.slice(2));
  }

  static createNodes (leaves: Array<string>): Array<MerkleNode> {
    return leaves.map(leaf => new MerkleNode(leaf));
  }

  public createTree (level: Array<MerkleNode>): string {
    if (level.length === 1) {
      return level[0].data;
    }

    const levelSize = level.length;
    const nextLevel = [];

    let i = 0;
    while (i < levelSize) {
      // JS stores hashes as hex-encoded strings
      const combinedData = this.NodeSalt + level[i].data.slice(2) + level[i + 1].data.slice(2);
      const combined = web3Utils.sha3(combinedData);
      const nextNode = new MerkleNode(combined, level[i], level[i + 1]);
      nextLevel.push(nextNode);
      i += 2;
    }

    this.tree.push(nextLevel);
    return this.createTree(nextLevel);
  }

  public getInclusionProof (leaf: string): string {
    const hashedLeaf = MerkleTree.hashLeaf(leaf);

    let index = this.leaves.indexOf(hashedLeaf);
    if (index === -1) {
      throw new Error('Argument is not a leaf in the tree');
    }

    let proof = '0x';
    for (let i = 0; i < this.height; i++) {
      let siblingIndex;
      if (index % 2 === 0) {
        siblingIndex = index + 1;
      } else {
        siblingIndex = index - 1;
      }
      index = Math.floor(index / 2);

      proof += this.tree[i][siblingIndex].data.slice(2);
    }

    return proof;
  }
}

export default MerkleTree;
