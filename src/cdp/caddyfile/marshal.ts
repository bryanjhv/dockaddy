import type { Block, Container } from './caddyfile'
import type { Token } from './lexer'
import {
	Block_AddKeys,
	Block_IsGlobalBlock,
	Block_IsMatcher,
	Block_IsSnippet,
	Container_AddBlock,
	CreateBlock,
	CreateContainer,
} from './caddyfile'
import { _lexer_load, _lexer_next, _new_lexer } from './lexer'

export function Container_Marshal(container: Container): string {
	Container_sort(container)
	const buffer: string[] = []
	Container_write(container, buffer, 0)
	return buffer.join('')
}

export function Block_Marshal(block: Block): string {
	Container_sort(block)
	const buffer: string[] = []
	Block_write(block, buffer, 0)
	return buffer.join('')
}

function Container_write(container: Container, buffer: string[], level: number): void {
	for (const block of container.Children)
		Block_write(block, buffer, level)
}

function Block_write(block: Block, buffer: string[], level: number): void {
	buffer.push('\t'.repeat(level))
	let needsWhitespace = false
	for (const key of block.Keys) {
		if (needsWhitespace)
			buffer.push(' ')

		if (key.includes('\n') || key.includes('"')) {
			buffer.push('`')
			buffer.push(key.replaceAll('`', '\\`'))
			buffer.push('`')
		}
		else if (key.includes(' ')) {
			buffer.push('"')
			buffer.push(key.replaceAll('"', '\\"'))
			buffer.push('"')
		}
		else {
			buffer.push(key)
		}

		needsWhitespace = true
	}
	if (block.Children.length > 0) {
		if (needsWhitespace)
			buffer.push(' ')
		buffer.push('{\n')
		Container_write(block, buffer, level + 1)
		buffer.push(`${'\t'.repeat(level)}}`)
	}
	buffer.push('\n')
}

function Container_sort(container: Container): void {
	for (const block of container.Children)
		Container_sort(block)
	container.Children.sort((a, b) => compareBlocks(a, b))
}

function compareBlocks(blockA: Block, blockB: Block): number {
	if (Block_IsGlobalBlock(blockA) !== Block_IsGlobalBlock(blockB))
		return Block_IsGlobalBlock(blockA) ? -1 : 1
	if (Block_IsSnippet(blockA) !== Block_IsSnippet(blockB))
		return Block_IsSnippet(blockA) ? -1 : 1
	if (Block_IsMatcher(blockA) !== Block_IsMatcher(blockB))
		return Block_IsMatcher(blockA) ? -1 : 1
	if (blockA.Order !== blockB.Order)
		return blockA.Order < blockB.Order ? -1 : 1
	for (let keyIndex = 0; keyIndex < Math.min(blockA.Keys.length, blockB.Keys.length); keyIndex++) {
		if (blockA.Keys[keyIndex]! !== blockB.Keys[keyIndex]!)
			return blockA.Keys[keyIndex]! < blockB.Keys[keyIndex]! ? -1 : 1
	}
	if (blockA.Keys.length !== blockB.Keys.length)
		return blockA.Keys.length < blockB.Keys.length ? -1 : 1
	const commonChildrenLength = Math.min(blockA.Children.length, blockB.Children.length)
	for (let c = 0; c < commonChildrenLength; c++) {
		const childComparison = compareBlocks(blockA.Children[c]!, blockB.Children[c]!)
		if (childComparison !== 0)
			return childComparison
	}
	if (blockA.Children.length !== blockB.Children.length)
		return blockA.Children.length < blockB.Children.length ? -1 : 1
	return 0
}

export function Unmarshal(caddyfileContent: string): Container {
	const tokens = allTokens('', caddyfileContent)

	return parseContainer(tokens)
}

function allTokens(filename: string, input: string): Token[] {
	const l = _new_lexer()
	_lexer_load(l, input)
	const tokens: Token[] = []
	while (_lexer_next(l)) {
		l.token.File = filename
		tokens.push(l.token)
	}
	return tokens
}

function parseContainer(tokens: Token[]): Container {
	const rootContainer = CreateContainer()
	const stack: Container[] = [rootContainer]
	let isNewBlock = true
	let tokenLine = -1

	let currentBlock: Block | undefined

	for (const token of tokens) {
		if (token.Line !== tokenLine) {
			if (tokenLine !== -1)
				isNewBlock = true
			tokenLine = token.Line
		}
		if (token.Text === '}') {
			if (stack.length === 1)
				throw new Error(`Unexpected token '}' at line ${token.Line}`)
			stack.pop()
		}
		else {
			if (isNewBlock) {
				const parentBlock = stack[stack.length - 1]!
				currentBlock = CreateBlock()
				currentBlock.Order = parentBlock.Children.length
				Container_AddBlock(parentBlock, currentBlock)
				isNewBlock = false
			}
			if (token.Text === '{') {
				stack.push(currentBlock!)
			}
			else {
				Block_AddKeys(currentBlock!, token.Text)
				tokenLine += (token.Text.match(/\n/g) ?? []).length
			}
		}
	}

	return rootContainer
}

export { Container_sort as _Container_sort }
