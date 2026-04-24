export interface Block
	extends Container {
	Order: number
	Keys: string[]
}

export interface Container {
	Children: Block[]
}

export function CreateBlock(): Block {
	return {
		...CreateContainer(),
		Order: 0x7FFFFFFF,
		Keys: [],
	}
}

export function CreateContainer(): Container {
	return {
		Children: [],
	}
}

export function Block_AddKeys(block: Block, ...keys: string[]): void {
	block.Keys.push(...keys)
}

export function Container_AddBlock(container: Container, block: Block): void {
	container.Children.push(block)
}

export function Block_GetFirstKey(block: Block): string {
	return block.Keys[0] ?? ''
}

export function Container_GetAllByFirstKey(container: Container, firstKey: string): Block[] {
	return container.Children.filter(block => Block_GetFirstKey(block) === firstKey)
}

export function Container_Remove(container: Container, blockToDelete: Block): void {
	container.Children = container.Children.filter(block => block !== blockToDelete)
}

export function Block_IsGlobalBlock(block: Block): boolean {
	return block.Keys.length === 0
}

export function Block_IsSnippet(block: Block): boolean {
	return block.Keys.length === 1 && block.Keys[0]!.startsWith('(') && block.Keys[0]!.endsWith(')')
}

export function Block_IsMatcher(block: Block): boolean {
	return block.Keys.length > 0 && block.Keys[0]!.startsWith('@')
}
