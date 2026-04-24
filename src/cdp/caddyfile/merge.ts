/* eslint-disable no-labels */

import type { Block, Container } from './caddyfile'
import { Block_AddKeys, Block_GetFirstKey, Container_AddBlock, Container_GetAllByFirstKey } from './caddyfile'

export function Container_Merge(containerA: Container, containerB: Container): void {
	OuterLoop:
	for (const blockB of containerB.Children) {
		const firstKey = Block_GetFirstKey(blockB)
		for (const blockA of Container_GetAllByFirstKey(containerA, firstKey)) {
			if ((firstKey === 'reverse_proxy' || firstKey === 'php_fastcgi') && getMatcher(blockA) === getMatcher(blockB)) {
				mergeReverseProxyLike(blockA, blockB)
				continue OuterLoop
			}
			else if (blocksAreEqual(blockA, blockB)) {
				Container_Merge(blockA, blockB)
				continue OuterLoop
			}
		}
		Container_AddBlock(containerA, blockB)
	}
}

function mergeReverseProxyLike(blockA: Block, blockB: Block): void {
	blockB.Keys.slice(1).forEach((key, index) => {
		if (index > 0 || !isMatcher(key))
			Block_AddKeys(blockA, key)
	})
	Container_Merge(blockA, blockB)
}

function getMatcher(block: Block): string {
	if (block.Keys.length <= 1 || !isMatcher(block.Keys[1]!))
		return '*'
	return block.Keys[1]!
}

function isMatcher(value: string): boolean {
	return value === '*' || value.startsWith('/') || value.startsWith('@')
}

function blocksAreEqual(blockA: Block, blockB: Block): boolean {
	if (blockA.Keys.length !== blockB.Keys.length)
		return false
	for (let i = 0; i < blockA.Keys.length; i++) {
		if (blockA.Keys[i] !== blockB.Keys[i])
			return false
	}
	return true
}
