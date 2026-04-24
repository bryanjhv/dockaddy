import type { Block, Container } from './caddyfile'
import { Block_AddKeys, Container_AddBlock, CreateBlock, CreateContainer } from './caddyfile'
import { _lexer_load, _lexer_next, _new_lexer } from './lexer'

const labelParserRegex = /^(?:(.+)\.)?(?:(\d+)_)?([^.]+?)(?:_\d+)?$/

const escapedDotPlaceholder = '\x00'

type _FuncMap = Record<string, (...args: unknown[]) => unknown>

export function FromLabels(labels: Record<string, string>, templateData: unknown, templateFuncs: _FuncMap): Container {
	const container = CreateContainer()

	const blocksByPath = new Map<string, Block>()
	for (const [label, value] of Object.entries(labels)) {
		const block = getOrCreateBlock(container, label, blocksByPath)
		const argsText = processVariables(templateData, templateFuncs, value)
		const args = parseArgs(argsText)
		Block_AddKeys(block, ...args)
	}

	return container
}

function getOrCreateBlock(container: Container, path: string, blocksByPath: Map<string, Block>): Block {
	let block = blocksByPath.get(path)
	if (block)
		return block

	let [parentPath, order, name] = parsePath(path.replaceAll('\\.', escapedDotPlaceholder))
	parentPath = parentPath.replaceAll(escapedDotPlaceholder, '\\.')
	name = name.replaceAll(escapedDotPlaceholder, '.')

	block = CreateBlock()
	block.Order = order

	if (parentPath !== '') {
		const parentBlock = getOrCreateBlock(container, parentPath, blocksByPath)
		Block_AddKeys(block, name)
		Container_AddBlock(parentBlock, block)
	}
	else {
		Container_AddBlock(container, block)
	}

	blocksByPath.set(path, block)

	return block
}

function parsePath(path: string): [string, number, string] {
	const match = path.match(labelParserRegex)
	const parentPath = match?.[1] ?? ''
	let order = 0x7FFFFFFF
	if (match?.[2])
		order = Number.parseInt(match[2], 10)
	const name = match?.[3] ?? ''
	return [parentPath, order, name]
}

// custom simple implementation
function processVariables(_data: unknown, funcs: _FuncMap, content: string): string {
	const exprRegex = /\{\{(.*?)\}\}/g
	return content.replace(exprRegex, (match, expr: string) => {
		const trimmed = expr.trim()
		if (/^(['"]).*\1$/.test(trimmed))
			return trimmed.slice(1, -1)
		const parts = trimmed.split(/\s+/)
		if (!parts[0])
			return match
		const func = parts[0]
		if (typeof funcs[func] !== 'function')
			throw new Error(`template: :1: function "${func}" not defined`)
		const args: unknown[] = []
		for (const arg of parts.slice(1)) {
			const numArg = Number(arg)
			if (typeof funcs[arg] === 'function')
				args.push(funcs[arg]())
			else if (!Number.isNaN(numArg))
				args.push(numArg)
			else
				return match
		}
		return funcs[func](...args) as string
	})
}

function parseArgs(text: string): string[] {
	if (text.length === 0)
		return []
	const l = _new_lexer()
	_lexer_load(l, text)
	const args: string[] = []
	while (_lexer_next(l))
		args.push(l.token.Text)
	return args
}

export type { _FuncMap }
